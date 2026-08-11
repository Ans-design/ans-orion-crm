import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/server/db/prisma';
import type { PrismaTx } from '@/lib/services/SequenceService';
import { parseOrderAcceptSnapshot, type OrderPaymentSnapshot } from '@/lib/commande/order-snapshot';
import { paidTotal } from '@/lib/server/modules/factures/factures.repository';
import { acceptedDevisStatut, devisExpiryWatchStatuts } from '@/lib/server/data/prisma-statut-bridge';
import { parseDevisNotes } from '@/lib/devis-meta';
import { paiementsForCommandeWhere } from '@/lib/server/modules/paiements/paiements.repository';
import { parsePaymentMeta } from '@/lib/server/modules/paiements/paiement-payment-meta';
import { roundMga } from '@/lib/money/mga';

function paymentStatus(montantPaye: number, total: number): OrderPaymentSnapshot['paymentStatus'] {
  if (montantPaye <= 0) return 'non payé';
  if (montantPaye >= total) return 'soldé';
  return 'partiel';
}

export function buildPaymentSnapshot(
  total: number,
  montantPaye: number,
  lastPaiement?: { mode: string; reference: string | null; notes?: string | null; datePaiement?: Date | string | null } | null,
): OrderPaymentSnapshot & { syncedAt: string } {
  const { meta } = parsePaymentMeta(lastPaiement?.notes);
  const paymentTime = meta?.paymentTime
    ?? (lastPaiement?.datePaiement
      ? new Date(lastPaiement.datePaiement).toLocaleString('fr-FR')
      : undefined);

  return {
    mode: lastPaiement?.mode ?? (montantPaye > 0 ? 'Encaissement' : 'Non payé'),
    mobileMoneyProvider: meta?.mobileMoneyProvider ?? undefined,
    bankName: meta?.bankName ?? undefined,
    reference: lastPaiement?.reference ?? undefined,
    paymentTime,
    payerName: meta?.payerName ?? undefined,
    montantPaye,
    resteAPayer: Math.max(0, total - montantPaye),
    paymentStatus: paymentStatus(montantPaye, total),
    syncedAt: new Date().toISOString(),
  };
}

/** Recalcule acompte/reste + persiste paymentSnapshot (et met à jour configSnapshot v1 si présent). */
export async function syncCommandePaymentSnapshot(commandeId: string, tx?: PrismaTx) {
  const db = tx ?? prisma;
  const cmd = await db.commande.findUnique({ where: { id: commandeId } });
  if (!cmd) return null;

  const paiements = await db.paiement.findMany({
    where: paiementsForCommandeWhere(commandeId),
    orderBy: { datePaiement: 'desc' },
  });

  const totalPaye = paidTotal(paiements);
  const totalCmd = roundMga(cmd.total);
  const reste = Math.max(0, totalCmd - roundMga(totalPaye));
  const paymentSnapshot = buildPaymentSnapshot(totalCmd, totalPaye, paiements[0] ?? null);

  const parsed = parseOrderAcceptSnapshot(cmd.configSnapshot);
  const configSnapshot = parsed
    ? { ...parsed, paymentSnapshot }
    : cmd.configSnapshot;

  await db.commande.update({
    where: { id: commandeId },
    data: {
      acompte: roundMga(totalPaye),
      reste,
      paymentSnapshot: paymentSnapshot as object,
      ...(parsed ? { configSnapshot: configSnapshot as object } : {}),
    },
  });

  return { totalPaye, reste, paymentSnapshot };
}

export type EntitySnapshotBackfillResult = {
  dryRun: boolean;
  paymentUpdated: number;
  logisticsUpdated: number;
};

/** Backfill paymentSnapshot (commandes) et logisticsSnapshot (devis acceptés). */
export async function backfillEntitySnapshots(
  options: { dryRun?: boolean; prismaClient?: PrismaTx } = {},
): Promise<EntitySnapshotBackfillResult> {
  const dryRun = options.dryRun ?? false;
  const prismaClient = options.prismaClient ?? prisma;

  const commandes = await prismaClient.commande.findMany({
    where: { paymentSnapshot: { equals: Prisma.DbNull } },
    select: { id: true, numero: true },
    orderBy: { createdAt: 'asc' },
  });

  let paymentUpdated = 0;
  for (const cmd of commandes) {
    if (!dryRun) {
      await syncCommandePaymentSnapshot(cmd.id, prismaClient);
    }
    paymentUpdated += 1;
  }

  const devisList = await prismaClient.devis.findMany({
    where: { statut: acceptedDevisStatut(), logisticsSnapshot: { equals: Prisma.DbNull } },
    include: {
      commandes: { select: { configSnapshot: true }, take: 1, orderBy: { createdAt: 'asc' } },
    },
    orderBy: { acceptedAt: 'asc' },
  });

  let logisticsUpdated = 0;
  for (const devis of devisList) {
    const cmdSnapshot = devis.commandes[0]
      ? parseOrderAcceptSnapshot(devis.commandes[0].configSnapshot)
      : null;
    const { meta } = parseDevisNotes(devis.notes);
    const logistics =
      cmdSnapshot?.logisticsSnapshot ??
      (meta
        ? {
            modeExpedition: meta.modeExpedition,
            expeditionDetails: meta.expeditionDetails,
            dateLivraison: meta.dateLivraison,
            delaiExecution: meta.delaiExecution,
            priorite: meta.priorite,
            deliveryAddress: meta.logistics?.deliveryAddress,
            deliveryAxis: meta.logistics?.deliveryAxis,
            deliveryLandmark: meta.logistics?.deliveryLandmark,
          }
        : null);

    if (!logistics || Object.values(logistics).every((v) => v == null || v === '')) {
      continue;
    }

    if (!dryRun) {
      await prismaClient.devis.update({
        where: { id: devis.id },
        data: { logisticsSnapshot: logistics as object },
      });
    }
    logisticsUpdated += 1;
  }

  return { dryRun, paymentUpdated, logisticsUpdated };
}
