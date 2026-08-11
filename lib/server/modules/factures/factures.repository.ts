import { prisma } from '@/lib/server/db/prisma';
import { containsQ } from '@/lib/prisma-filters';
import {
  factureStatutFromLabel,
  unpaidFactureStatuts,
} from '@/lib/server/data/prisma-statut-bridge';

import type { FactureListQuery } from './factures.validation';

export type FactureListFilters = {
  search?: string;
  statut?: string;
  impayes?: boolean;
  overdue?: boolean;
  commandeId?: string;
  trash?: boolean;
};

export function buildFactureWhere(filters: FactureListFilters) {
  const where: Record<string, unknown> = {
    archived: filters.trash === true,
  };
  if (filters.impayes) {
    where.statut = { in: unpaidFactureStatuts() };
  } else if (filters.statut) {
    where.statut = factureStatutFromLabel(filters.statut);
  }
  if (filters.overdue) {
    where.statut = { in: unpaidFactureStatuts() };
    where.dateEcheance = { lt: new Date() };
  }
  if (filters.commandeId) where.commandeId = filters.commandeId;
  if (filters.search) {
    where.OR = [{ numero: containsQ(filters.search) }, { client: { name: containsQ(filters.search) } }];
  }
  return where;
}

const factureListInclude = {
  commande: true,
  client: true,
  paiements: true,
};

const factureDetailInclude = {
  commande: { include: { client: true } },
  client: true,
  paiements: { orderBy: { datePaiement: 'desc' as const } },
};

export const facturesRepository = {
  count(where: Record<string, unknown>) {
    return prisma.facture.count({ where });
  },

  findManyWithRelations(where: Record<string, unknown>, pagination?: { skip: number; take: number }) {
    return prisma.facture.findMany({
      where,
      include: factureListInclude,
      orderBy: { createdAt: 'desc' },
      ...(pagination ? { skip: pagination.skip, take: pagination.take } : {}),
    });
  },

  findById(id: string) {
    return prisma.facture.findUnique({ where: { id } });
  },

  findByIdWithDetail(id: string) {
    return prisma.facture.findUnique({
      where: { id },
      include: factureDetailInclude,
    });
  },

  findByIdWithPaiements(id: string) {
    return prisma.facture.findUnique({
      where: { id },
      include: { paiements: true },
    });
  },

  create(data: Parameters<typeof prisma.facture.create>[0]['data']) {
    return prisma.facture.create({
      data,
      include: factureListInclude,
    });
  },

  update(id: string, data: Parameters<typeof prisma.facture.update>[0]['data']) {
    return prisma.facture.update({
      where: { id },
      data,
      include: factureListInclude,
    });
  },
};

export function parseFactureListFilters(query: {
  search: string;
  statut: string;
  impayes: boolean;
  overdue: boolean;
  commandeId: string;
  trash?: boolean;
}): FactureListFilters {
  return {
    search: query.search || undefined,
    statut: query.statut || undefined,
    impayes: query.impayes,
    overdue: query.overdue,
    commandeId: query.commandeId || undefined,
    trash: query.trash,
  };
}

import { computePaidTotal } from '@/lib/finance/payment-totals';

export function paidTotal(paiements: { montant: number; type: string }[]) {
  return computePaidTotal(paiements);
}
