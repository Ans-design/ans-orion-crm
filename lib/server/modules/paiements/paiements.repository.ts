import { prisma } from '@/lib/server/db/prisma';
import { containsQ } from '@/lib/prisma-filters';
import type { PaiementListQuery } from './paiements.validation';

type PaiementDb = Pick<typeof prisma, 'paiement'>;

export function buildPaiementWhere(query: PaiementListQuery) {
  const where: Record<string, unknown> = {
    archived: query.trash === true,
  };
  if (query.mode) where.mode = query.mode;
  if (query.commandeId) where.commandeId = query.commandeId;
  if (query.search) {
    where.OR = [
      { numero: containsQ(query.search) },
      { reference: containsQ(query.search) },
      { client: { name: containsQ(query.search) } },
    ];
  }
  return where;
}

const paiementDetailInclude = {
  facture: true,
  commande: true,
  client: true,
};

export const paiementsRepository = {
  findMany(where: Record<string, unknown>) {
    return prisma.paiement.findMany({
      where,
      include: paiementDetailInclude,
      orderBy: { datePaiement: 'desc' },
    });
  },

  findById(id: string) {
    return prisma.paiement.findUnique({
      where: { id },
      include: paiementDetailInclude,
    });
  },

  update(id: string, data: Parameters<typeof prisma.paiement.update>[0]['data']) {
    return prisma.paiement.update({
      where: { id },
      data,
      include: paiementDetailInclude,
    });
  },
};

import { computePaidTotal } from '@/lib/finance/payment-totals';

export function paidTotal(paiements: { montant: number; type: string; statut?: string | null }[]) {
  return computePaidTotal(paiements);
}

/**
 * Paiements d’une commande :
 * - lien direct `paiement.commandeId`
 * - OU via facture **uniquement** si `paiement.commandeId` est null
 *   (évite de compter un paiement d’une autre commande lié à la même facture).
 */
export function paiementsForCommandeWhere(commandeId: string) {
  return {
    OR: [
      { commandeId },
      { commandeId: null, facture: { commandeId } },
    ],
  };
}

export function paiementsForCommandesWhere(commandeIds: string[]) {
  return {
    OR: [
      { commandeId: { in: commandeIds } },
      { commandeId: null, facture: { commandeId: { in: commandeIds } } },
    ],
  };
}

export async function findCommandeRelatedPaiements(commandeId: string, tx?: PaiementDb) {
  const db = tx ?? prisma;
  return db.paiement.findMany({
    where: paiementsForCommandeWhere(commandeId),
    orderBy: [{ datePaiement: 'desc' }, { createdAt: 'desc' }],
  });
}

export function commandeRemainingAmount(
  commandeTotal: number,
  paiements: { montant: number; type: string; statut?: string | null }[],
): number {
  return Math.max(0, commandeTotal - paidTotal(paiements));
}
