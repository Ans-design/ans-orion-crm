import { prisma } from '@/lib/prisma';
import { getCommandeWorkflowState } from '@/lib/services/commande-workflow-service';
import { listActiveBlocages } from '@/lib/services/commande-blocage-service';
import { parseOrderAcceptSnapshot, buildOrderSnapshotFromCommande } from '@/lib/commande/order-snapshot';
import { resolveCommandeNextAction } from '@/lib/commande/order-next-action';
import { findCommandeRelatedPaiements, paidTotal, commandeRemainingAmount } from '@/lib/server/modules/paiements/paiements.repository';
import { normalizeCommandeStatut } from '@/lib/data/status-registry';
import { commandeStatutLabel } from '@/lib/server/data/prisma-statut-bridge';

export async function getCommande360(id: string) {
  const commande = await prisma.commande.findUnique({
    where: { id },
    include: {
      client: true,
      devis: { include: { lignes: true } },
      lignes: { orderBy: { sortOrder: 'asc' } },
      proofs: { include: { versions: { orderBy: { createdAt: 'desc' } } }, orderBy: { createdAt: 'desc' } },
      productionDossiers: { include: { etapes: { orderBy: { ordre: 'asc' } }, incidents: true } },
      livraisons: { orderBy: { createdAt: 'desc' } },
      factures: { orderBy: { createdAt: 'desc' } },
      paiements: { orderBy: { createdAt: 'desc' } },
      metierTasks: { orderBy: { dueDate: 'asc' } },
      studioBriefs: { include: { versions: { orderBy: { createdAt: 'desc' } } } },
      materialWastes: true,
    },
  });

  if (!commande) return null;

  const mergedPaiements = await findCommandeRelatedPaiements(id);
  const acompteReel = paidTotal(mergedPaiements);
  const resteReel = commandeRemainingAmount(commande.total, mergedPaiements);

  const [fichiers, auditLogs, reclamations, talkConversation, stockReservations, productions, qualiteControle, talkAttachments] = await Promise.all([
    prisma.fileAsset.findMany({
      where: { commandeId: id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.findMany({
      where: { entity: 'Commande', entityId: id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.clientReclamation.findMany({
      where: { commandeId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.talkConversation.findUnique({
      where: { commandeId: id },
      select: { id: true, name: true },
    }),
    prisma.stockReservation.findMany({
      where: { commandeId: id, status: 'active' },
      include: {
        stockItem: {
          select: {
            label: true,
            sku: true,
            quantity: true,
            reservedQty: true,
            unit: true,
          },
        },
      },
    }),
    prisma.production.findMany({
      where: { commandeId: id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true, statut: true, avancement: true, operateur: true, machine: true, createdAt: true,
        proofPhotoUrl: true, proofNote: true, proofAt: true, proofBy: true,
      },
    }),
    prisma.qualiteControle.findUnique({ where: { commandeId: id } }),
    prisma.talkAttachment.findMany({
      where: { commandeId: id },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        originalFileName: true,
        mimeType: true,
        sizeBytes: true,
        status: true,
        createdAt: true,
        fileAssetId: true,
      },
    }),
  ]);

  const timeline = [
    { type: 'commande', label: 'Commande créée', date: commande.createdAt, detail: commande.numero },
    ...commande.proofs.map((p) => ({
      type: 'bat',
      label: `BAT ${p.numero} — ${p.statut}`,
      date: p.validatedAt ?? p.sentAt ?? p.createdAt,
      detail: p.statut,
    })),
    ...commande.productionDossiers.flatMap((d) =>
      d.etapes.filter((e) => e.dateFin).map((e) => ({
        type: 'production',
        label: e.nom,
        date: e.dateFin!,
        detail: e.statut,
      })),
    ),
    ...commande.livraisons.map((l) => ({
      type: 'livraison',
      label: `Livraison ${l.numero}`,
      date: l.createdAt,
      detail: l.statut,
    })),
    ...commande.factures.map((f) => ({
      type: 'facture',
      label: `Facture ${f.numero}`,
      date: f.createdAt,
      detail: f.statut,
    })),
    ...mergedPaiements.map((p) => ({
      type: 'paiement',
      label: `Paiement ${p.mode}`,
      date: p.datePaiement ?? p.createdAt,
      detail: `${p.montant} MGA`,
    })),
    ...stockReservations.map((s) => ({
      type: 'stock',
      label: `Réservation stock — ${s.stockItem?.label ?? s.stockItemId}`,
      date: s.createdAt,
      detail: `${s.quantity} ${s.unit ?? ''}`,
    })),
    ...productions.map((p) => ({
      type: 'production_ordre',
      label: `Ordre production — ${p.statut}`,
      date: p.createdAt,
      detail: p.operateur ?? p.machine ?? '',
    })),
    ...talkAttachments.map((a) => ({
      type: 'talk_fichier',
      label: `ANS Talk — ${a.originalFileName}`,
      date: a.createdAt,
      detail: a.status,
    })),
    ...fichiers.map((f) => ({
      type: 'fichier',
      label: `Fichier — ${f.name}`,
      date: f.createdAt,
      detail: `${f.statut ?? 'Reçu'} · ${f.category}`,
    })),
    ...auditLogs.map((a) => ({
      type: 'audit',
      label: `${a.action} — ${a.entity}`,
      date: a.createdAt,
      detail: a.entityLabel ?? a.entity,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const workflowState = await getCommandeWorkflowState(id);
  const blocagesActifs = await listActiveBlocages(id);
  const stockReservationsView = stockReservations.map((reservation) => ({
    ...reservation,
    availableQty: reservation.stockItem
      ? Math.max(reservation.stockItem.quantity - (reservation.stockItem.reservedQty ?? 0), 0)
      : 0,
  }));

  const coutEstime = commande.total * 0.62;
  const margeEstimee = Math.round(commande.total - coutEstime);
  const margeEstimeePct = commande.total > 0 ? Math.round((margeEstimee / commande.total) * 100) : 0;

  const versionFileIds = commande.proofs.flatMap((p) =>
    p.versions.map((v) => v.fileAssetId).filter((fid): fid is string => !!fid),
  );
  const versionFiles =
    versionFileIds.length > 0
      ? await prisma.fileAsset.findMany({
          where: { id: { in: versionFileIds } },
          select: { id: true, name: true, mimeType: true, sizeBytes: true },
        })
      : [];
  const fileById = Object.fromEntries(versionFiles.map((f) => [f.id, f]));

  const commandeEnriched = {
    ...commande,
    acompte: acompteReel,
    reste: resteReel,
    paiements: mergedPaiements,
    proofs: commande.proofs.map((p) => ({
      ...p,
      versions: p.versions.map((v) => ({
        ...v,
        file: v.fileAssetId ? fileById[v.fileAssetId] ?? null : null,
      })),
    })),
  };

  const orderSnapshot =
    parseOrderAcceptSnapshot(commande.configSnapshot) ??
    buildOrderSnapshotFromCommande({
      commande: {
        id: commande.id,
        numero: commande.numero,
        total: commande.total,
        acompte: acompteReel,
        reste: resteReel,
        dateLiv: commande.dateLiv,
        priorite: commande.priorite,
        createdAt: commande.createdAt,
        clientId: commande.clientId,
      },
      client: commande.client,
      lignes: commande.lignes.map((l) => ({
        articleId: l.articleId,
        articleLabel: l.articleLabel,
        configSnapshot: l.configSnapshot,
        quantity: l.quantity,
        totalLigne: l.totalLigne,
      })),
      devis: commande.devis
        ? {
            id: commande.devis.id,
            numero: commande.devis.numero,
            sousTotal: commande.devis.sousTotal,
            remise: commande.devis.remise,
            totalHT: commande.devis.totalHT,
            totalTTC: commande.devis.totalTTC,
            validUntil: commande.devis.validUntil,
            clientId: commande.devis.clientId,
            notes: commande.devis.notes,
            lignes: commande.devis.lignes.map((l) => ({
              articleId: l.articleId,
              articleLabel: l.articleLabel,
              configSnapshot: l.configSnapshot,
              quantity: l.quantity,
              totalLigne: l.totalLigne,
              prixUnitaireForce: l.prixUnitaireForce,
              prixUnitaireAuto: l.prixUnitaireAuto,
            })),
          }
        : null,
    });
  const hasBatPending = commande.proofs.some(
    (p) => !['Validé', 'Verrouillé', 'Refusé'].includes(p.statut),
  );
  const nextAction = resolveCommandeNextAction({
    commandeId: id,
    statut: normalizeCommandeStatut(commandeStatutLabel(commande.statut)),
    reste: resteReel,
    total: commande.total,
    hasFacture: commande.factures.length > 0,
    hasLivraison: commande.livraisons.length > 0,
    hasDossierGpaO: commande.productionDossiers.length > 0,
    hasBatPending,
    blocagesActifs: blocagesActifs.length,
    factureId: commande.factures[0]?.id ?? null,
    dossierId: commande.productionDossiers[0]?.id ?? null,
    livraisonId: commande.livraisons[0]?.id ?? null,
    hasTalk: Boolean(talkConversation?.id),
    talkConversationId: talkConversation?.id ?? null,
  });

  return {
    commande: commandeEnriched,
    orderSnapshot,
    nextAction,
    fichiers,
    auditLogs,
    reclamations,
    timeline,
    workflow: workflowState ? { snapshot: workflowState.snapshot } : null,
    talkConversation,
    stockReservations: stockReservationsView,
    productions,
    qualiteControle,
    talkAttachments,
    materialWastes: commande.materialWastes,
    integration: {
      devisId: commande.devis?.id ?? null,
      proofId: commande.proofs[0]?.id ?? null,
      dossierId: commande.productionDossiers[0]?.id ?? null,
      livraisonId: commande.livraisons[0]?.id ?? null,
      factureId: commande.factures[0]?.id ?? null,
      qualiteId: qualiteControle ? id : null,
    },
    summary: {
      totalBAT: commande.proofs.length,
      batValides: commande.proofs.filter((p) => p.statut === 'Validé' || p.statut === 'Verrouillé').length,
      dossiersProduction: commande.productionDossiers.length,
      tachesOuvertes: commande.metierTasks.filter((t) => !['Terminée', 'Annulée', 'Terminé'].includes(t.status)).length,
      livraisons: commande.livraisons.length,
      factures: commande.factures.length,
      paiementsTotal: acompteReel,
      resteAPayer: resteReel,
      fichiers: fichiers.length + talkAttachments.length,
      stockReservations: stockReservations.length,
      productions: productions.length,
      blocagesActifs: blocagesActifs.length,
      margeEstimee,
      margeEstimeePct,
    },
    blocages: blocagesActifs,
  };
}
