import { prisma } from '@/lib/prisma';
import { FactureStatut } from '@prisma/client';
import { syncCommandePaymentSnapshot } from '@/lib/server/modules/snapshots/snapshot.service';
import type { Prisma } from '@prisma/client';
import { logAudit } from '@/lib/audit';
import { nextSequenceSafe } from '@/lib/services/SequenceService';
import type { PrismaTx } from '@/lib/services/SequenceService';
import { PRISMA_TX_OPTIONS } from '@/lib/prisma-transaction';
import {
  computePaidTotal,
  resolveCommandeLinkedFactureStatut,
  resolveFactureStatutFromPayments,
} from '@/lib/finance/payment-totals';

import { getFiscalConfig } from '@/lib/services/fiscal-config-service';
import { roundMga, ttcToHtMga } from '@/lib/pricing/mga-round';
import { assertCommandeBillable } from '@/lib/commande/facture-snapshot-guard';

type Tx = Prisma.TransactionClient;

async function createFactureInTx(
  commandeId: string,
  clientId: string | null | undefined,
  remise: number,
  tvaRate: number,
  tx: PrismaTx,
) {
  const cmd = await tx.commande.findUnique({
    where: { id: commandeId },
    include: { lignes: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!cmd) throw new Error('Commande introuvable');

  const lignes =
    cmd.lignes.length > 0
      ? cmd.lignes.map((l) => ({
          description: l.articleLabel,
          qty: l.quantity,
          pu: roundMga(l.totalLigne / (l.quantity || 1)),
          total: roundMga(l.totalLigne),
        }))
      : [{
          description: cmd.article,
          qty: cmd.qty,
          pu: roundMga(cmd.total / (cmd.qty || 1)),
          total: roundMga(cmd.total),
        }];

  const sousTotal = roundMga(lignes.reduce((s, l) => s + l.total, 0));
  const totalTTC = roundMga(cmd.total);
  const totalHT = ttcToHtMga(totalTTC, tvaRate);
  const numero = await nextSequenceSafe('FAC', () => tx.facture.count(), tx);

  return tx.facture.create({
    data: {
      numero,
      commandeId: cmd.id,
      clientId: clientId || cmd.clientId,
      lignes,
      sousTotal,
      remise: roundMga(remise),
      tva: tvaRate,
      totalHT,
      totalTTC,
      statut: FactureStatut.Brouillon,
    },
  });
}

/** Crée une facture brouillon liée à la commande si aucune facture active n'existe.
 * Canon : `commande.total` = TTC ; HT dérivé via config fiscale.
 */
export async function ensureFactureForCommande(
  commandeId: string,
  opts?: { userId?: string; userName?: string; remise?: number },
) {
  const fiscal = await getFiscalConfig();
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.facture.findFirst({
      where: { commandeId, statut: { not: FactureStatut.Annulee } },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return { facture: existing, created: false as const };

    const cmd = await tx.commande.findUnique({
      where: { id: commandeId },
      include: {
        lignes: { select: { articleLabel: true, configSnapshot: true } },
      },
    });
    if (!cmd) return { error: 'NOT_FOUND' as const };

    const guard = assertCommandeBillable(cmd);
    if (!guard.ok) {
      return { error: guard.code, message: guard.message };
    }

    const facture = await createFactureInTx(
      commandeId,
      cmd.clientId,
      opts?.remise ?? 0,
      fiscal.tvaRate,
      tx,
    );
    return { facture, created: true as const };
  }, PRISMA_TX_OPTIONS);

  if ('error' in result) return result;

  if (result.created) {
    await logAudit({
      userId: opts?.userId,
      userName: opts?.userName,
      action: 'WORKFLOW_FACTURE',
      entity: 'Facture',
      entityId: result.facture.id,
      entityLabel: result.facture.numero,
      details: { commandeId, auto: true },
    });
  }

  return result;
}

/** Recalcule acompte / reste commande depuis les paiements liés (facture ou commande). */
export async function syncCommandePaiementTotals(commandeId: string, tx?: Tx) {
  return syncCommandePaymentSnapshot(commandeId, tx);
}

/** Met à jour le statut facture selon les paiements enregistrés. */
export async function syncFactureStatutFromPaiements(factureId: string, tx?: Tx) {
  const db = tx ?? prisma;
  const facture = await db.facture.findUnique({
    where: { id: factureId },
    include: { paiements: true },
  });
  if (!facture || facture.statut === FactureStatut.Annulee) return facture;

  const totalPaye = computePaidTotal(facture.paiements);
  const newStatut = resolveFactureStatutFromPayments(totalPaye, facture.totalTTC, facture.statut);
  if (!newStatut) return facture;

  return db.facture.update({
    where: { id: factureId },
    data: {
      statut: newStatut,
      ...(newStatut !== 'Brouillon' && !facture.dateEmission ? { dateEmission: new Date() } : {}),
    },
    include: { paiements: true, commande: true, client: true },
  });
}

/** Après encaissement — synchronise facture(s) + commande liée. */
export async function syncCommandeLinkedFacturesFromPayments(commandeId: string, tx?: Tx) {
  const db = tx ?? prisma;
  const commande = await db.commande.findUnique({
    where: { id: commandeId },
    select: { id: true, total: true },
  });
  if (!commande) return;

  const { paiementsForCommandeWhere } = await import(
    '@/lib/server/modules/paiements/paiements.repository'
  );
  const paiements = await db.paiement.findMany({
    where: paiementsForCommandeWhere(commandeId),
  });
  const totalPaye = computePaidTotal(paiements);

  const factures = await db.facture.findMany({
    where: { commandeId, statut: { not: FactureStatut.Annulee } },
  });

  for (const facture of factures) {
    const newStatut = resolveCommandeLinkedFactureStatut(
      totalPaye,
      facture.totalTTC,
      commande.total,
      facture.statut,
    );
    if (!newStatut) continue;

    await db.facture.update({
      where: { id: facture.id },
      data: {
        statut: newStatut,
        ...(newStatut !== FactureStatut.Brouillon && !facture.dateEmission ? { dateEmission: new Date() } : {}),
      },
    });
  }
}

/** Après encaissement — synchronise facture + commande liée. */
export async function afterPaiementRecorded(
  paiement: { factureId: string | null; commandeId: string | null },
  tx?: Tx,
) {
  const db = tx ?? prisma;

  if (paiement.factureId) {
    const facture = await db.facture.findUnique({
      where: { id: paiement.factureId },
      select: { commandeId: true },
    });
    await syncFactureStatutFromPaiements(paiement.factureId, db);
    if (facture?.commandeId) {
      await syncCommandePaiementTotals(facture.commandeId, db);
      await syncCommandeLinkedFacturesFromPayments(facture.commandeId, db);
    }
  }

  if (paiement.commandeId) {
    await syncCommandePaiementTotals(paiement.commandeId, db);
    await syncCommandeLinkedFacturesFromPayments(paiement.commandeId, db);
  }
}
