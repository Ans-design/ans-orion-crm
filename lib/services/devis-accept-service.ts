import { prisma } from '@/lib/prisma';
import { DevisStatut, CommandeStatut } from '@prisma/client';
import { nextSequenceSafe } from '@/lib/services/SequenceService';
import { PRISMA_TX_OPTIONS } from '@/lib/prisma-transaction';
import {
  buildCommandeArticleSummary,
  mapDevisLignesToCommande,
  sumCommandeLignes,
} from '@/lib/services/commande-service';
import { createNotification } from '@/lib/services/notification-service';
import { reserveStockForDevisAccept } from '@/lib/services/stock-reservation-service';
import { assertDevisAcceptable } from '@/lib/services/devis-expiration-service';
import { postOrionAssistantMessage } from '@/lib/orion/orion-assistant';
import { linkDevisPaymentsToCommande } from '@/lib/services/devis-acompte-service';
import { parseDevisNotes, enrichPaymentMeta } from '@/lib/devis-meta';
import { buildCommandeNoteFromMeta, mapPrioriteToCommande } from '@/lib/devis/logistics';
import { buildOrderAcceptSnapshot } from '@/lib/commande/order-snapshot';
import { shouldSetEnAttenteStock } from '@/lib/stock/en-attente-stock-rule';

export type AcceptDevisResult =
  | { ok: true; devis: { id: string; numero: string }; commande: { id: string; numero: string }; ligneCount: number; stockReservations: Awaited<ReturnType<typeof reserveStockForDevisAccept>> }
  | { ok: false; code: 'NOT_FOUND' | 'ALREADY_ACCEPTED' | 'NO_LIGNES' | 'EXPIRED' | 'REFUSED'; message: string };

export async function acceptDevisToCommande(
  devisId: string,
  opts?: { userId?: string; userName?: string; skipWorkflow?: boolean },
): Promise<AcceptDevisResult> {
  const result = await prisma.$transaction(async (tx) => {
    const devis = await tx.devis.findUnique({
      where: { id: devisId },
      include: { lignes: { orderBy: { sortOrder: 'asc' } }, client: true },
    });

    if (!devis) return { error: 'NOT_FOUND' as const };
    if (devis.lignes.length === 0) return { error: 'NO_LIGNES' as const };

    const existingCmd = await tx.commande.findFirst({
      where: { devisId },
      select: { id: true, numero: true },
    });
    if (existingCmd) {
      return { already: true as const, devis, created: existingCmd, ligneCount: devis.lignes.length, stockReservations: [] as Awaited<ReturnType<typeof reserveStockForDevisAccept>> };
    }
    if (devis.statut === DevisStatut.Accepte) return { error: 'ALREADY_ACCEPTED' as const };

    const check = assertDevisAcceptable(devis);
    if (!check.ok) {
      return { error: devis.statut === DevisStatut.Refuse ? ('REFUSED' as const) : ('EXPIRED' as const) };
    }

    const ligneInputs = mapDevisLignesToCommande(devis.lignes);
    const { total, qty } = sumCommandeLignes(ligneInputs);
    const article = buildCommandeArticleSummary(ligneInputs.map((l) => l.articleLabel));
    const numero = await nextSequenceSafe('CMD', () => tx.commande.count(), tx);

    const { meta } = parseDevisNotes(devis.notes);
    const commandeNote = buildCommandeNoteFromMeta(meta ?? {});
    const dateLiv = meta?.dateLivraison ? new Date(meta.dateLivraison) : null;
    const prioriteCmd = mapPrioriteToCommande(meta?.priorite);
    const paymentMeta = enrichPaymentMeta(meta ?? {}, devis.totalTTC);
    const montantPaye = paymentMeta.montantPaye ?? 0;
    const orderSnapshot = buildOrderAcceptSnapshot({
      devis: {
        id: devis.id,
        numero: devis.numero,
        sousTotal: devis.sousTotal,
        remise: devis.remise,
        totalHT: devis.totalHT,
        totalTTC: devis.totalTTC,
        validUntil: devis.validUntil,
        clientId: devis.clientId,
        client: devis.client,
        lignes: devis.lignes.map((l) => ({
          articleId: l.articleId,
          articleLabel: l.articleLabel,
          configSnapshot: l.configSnapshot,
          quantity: l.quantity,
          totalLigne: l.totalLigne,
          prixUnitaireForce: l.prixUnitaireForce,
          prixUnitaireAuto: l.prixUnitaireAuto,
        })),
      },
      meta,
    });

    /** Claim atomique avant create — empêche double commande (race). */
    const claim = await tx.devis.updateMany({
      where: { id: devisId, statut: { not: DevisStatut.Accepte } },
      data: {
        statut: DevisStatut.Accepte,
        acceptedAt: new Date(),
        logisticsSnapshot: orderSnapshot.logisticsSnapshot as object,
      },
    });
    if (claim.count === 0) return { error: 'ALREADY_ACCEPTED' as const };

    const created = await tx.commande.create({
      data: {
        numero,
        clientId: devis.clientId,
        devisId: devis.id,
        article,
        qty,
        total: devis.totalTTC,
        acompte: montantPaye,
        reste: Math.max(0, devis.totalTTC - montantPaye),
        statut: CommandeStatut.A_planifier,
        priorite: prioriteCmd,
        dateLiv: dateLiv && !Number.isNaN(dateLiv.getTime()) ? dateLiv : undefined,
        note: commandeNote,
        configSnapshot: orderSnapshot as object,
        paymentSnapshot: orderSnapshot.paymentSnapshot as object,
        lignes: {
          create: ligneInputs.map((l, i) => ({
            articleId: l.articleId ?? null,
            articleLabel: l.articleLabel,
            configSnapshot: l.configSnapshot ?? undefined,
            quantity: l.quantity,
            totalLigne: l.totalLigne,
            sortOrder: l.sortOrder ?? i,
          })),
        },
      },
      include: { lignes: true },
    });

    if (devis.clientId) {
      await tx.client.update({
        where: { id: devis.clientId },
        data: { cmds: { increment: 1 } },
      });
      const { syncClientFideleStatut } = await import('@/lib/services/client-fidele-service');
      await syncClientFideleStatut(devis.clientId, tx);
    }

    const stockReservations = await reserveStockForDevisAccept(tx, {
      devisId: devis.id,
      commandeId: created.id,
      devisNumero: devis.numero,
      commandeNumero: created.numero,
      lignes: devis.lignes.map((l) => ({
        articleId: l.articleId,
        articleLabel: l.articleLabel,
        category: l.category,
        configSnapshot: l.configSnapshot,
        quantity: l.quantity,
      })),
    });

    const { enqueueOutbox } = await import('@/lib/server/outbox');
    await enqueueOutbox({
      tx,
      type: 'DevisAccepted',
      aggregateType: 'Devis',
      aggregateId: devis.id,
      idempotencyKey: `devis-accepted:${devis.id}:${created.id}`,
      correlationId: created.id,
      payload: {
        devisId: devis.id,
        devisNumero: devis.numero,
        commandeId: created.id,
        commandeNumero: created.numero,
        ligneCount: ligneInputs.length,
      },
    });

    return { devis, created, ligneCount: ligneInputs.length, stockReservations };
  }, PRISMA_TX_OPTIONS);

  if ('error' in result) {
    const code = result.error;
    if (code === 'NOT_FOUND') return { ok: false, code, message: 'Devis introuvable' };
    if (code === 'ALREADY_ACCEPTED') return { ok: false, code, message: 'Devis déjà accepté' };
    if (code === 'NO_LIGNES') return { ok: false, code, message: 'Devis sans lignes' };
    if (code === 'EXPIRED') return { ok: false, code, message: 'Devis expiré — prolongez ou dupliquez avant conversion' };
    return { ok: false, code: 'REFUSED', message: 'Devis refusé' };
  }

  if ('already' in result && result.already) {
    return {
      ok: true,
      devis: { id: result.devis.id, numero: result.devis.numero },
      commande: { id: result.created.id, numero: result.created.numero },
      ligneCount: result.ligneCount,
      stockReservations: result.stockReservations,
    };
  }

  const reservedCount = result.stockReservations.filter((r) => r.status === 'reserved').length;
  const skippedCount = result.stockReservations.filter((r) => r.status === 'skipped').length;
  const stockNote =
    reservedCount > 0
      ? ` · ${reservedCount} réservation${reservedCount > 1 ? 's' : ''} stock`
      : skippedCount > 0
        ? ' · stock non réservé (insuffisant ou non mappé)'
        : '';

  await createNotification({
    title: 'Devis accepté',
    message: `${result.devis.numero} → commande ${result.created.numero} (${result.ligneCount} ligne${result.ligneCount > 1 ? 's' : ''})${stockNote}`,
    link: `/commandes/${result.created.id}`,
    type: 'success',
    category: 'devis',
  });

  await postOrionAssistantMessage({
    type: 'commande_creee',
    title: 'Commande créée',
    body: `${result.devis.numero} converti en ${result.created.numero}.`,
    link: `/commandes/${result.created.id}`,
    commandeId: result.created.id,
    dedupKey: `commande-creee:${result.created.id}`,
  });

  await linkDevisPaymentsToCommande(result.devis.id, result.created.id);

  const { postDevisTalkUpdate } = await import('@/lib/messaging/messaging-service');
  if (opts?.userId && opts?.userName) {
    await postDevisTalkUpdate(
      result.devis.id,
      `✅ Devis accepté → commande ${result.created.numero}. Suivi production dans le groupe commande.`,
      { userId: opts.userId, userName: opts.userName, userRole: 'commercial' },
    ).catch(() => {});
  }

  if (!opts?.skipWorkflow) {
    const { bootstrapCommandeWorkflow, transitionCommandeStatut } = await import('@/lib/services/commande-workflow-service');
    await bootstrapCommandeWorkflow(result.created.id, {
      userId: opts?.userId,
      userName: opts?.userName,
      priorite: result.created.priorite,
    });

    const hasInsufficientStock = shouldSetEnAttenteStock(result.stockReservations);
    // Mapping introuvable ≠ rupture stock : ne pas bloquer injustement en « En attente stock ».
    if (hasInsufficientStock) {
      await transitionCommandeStatut(result.created.id, 'En attente stock', {
        userId: opts?.userId,
        userName: opts?.userName,
      });
    }
  }

  return {
    ok: true,
    devis: { id: result.devis.id, numero: result.devis.numero },
    commande: { id: result.created.id, numero: result.created.numero },
    ligneCount: result.ligneCount,
    stockReservations: result.stockReservations,
  };
}
