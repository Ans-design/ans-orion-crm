import { ClientStatut } from '@prisma/client';
import { prisma } from '@/lib/server/db/prisma';
import { containsQ } from '@/lib/prisma-filters';
import { buildTextSearchOr } from '@/lib/server/search/text-search';
import {
  clientStatutFromLabel,
  fideleClientStatuts,
  unpaidFactureStatuts,
} from '@/lib/server/data/prisma-statut-bridge';

export type ClientListFilters = {
  search?: string;
  statut?: string;
  showArchived?: boolean;
  updatedFrom?: Date;
  updatedTo?: Date;
};

export function buildClientWhere(filters: ClientListFilters) {
  const where: Record<string, unknown> = { archived: filters.showArchived ?? false };
  if (filters.statut && filters.statut !== 'tous') {
    if (filters.statut === 'fidele') {
      where.statut = { in: fideleClientStatuts() };
    } else {
      where.statut = clientStatutFromLabel(filters.statut);
    }
  }
  const searchOr = buildTextSearchOr(filters.search, [
    (q) => ({ name: containsQ(q) }),
    (q) => ({ email: containsQ(q) }),
    (q) => ({ code: containsQ(q) }),
    (q) => ({ tel: containsQ(q) }),
    (q) => ({ nif: containsQ(q) }),
  ]);
  if (searchOr) where.OR = searchOr;
  if (filters.updatedFrom || filters.updatedTo) {
    where.updatedAt = {
      ...(filters.updatedFrom ? { gte: filters.updatedFrom } : {}),
      ...(filters.updatedTo ? { lte: filters.updatedTo } : {}),
    };
  }
  return where;
}

const clientListInclude = {
  _count: {
    select: {
      devis: true,
      commandes: true,
      reclamations: { where: { statut: { in: ['Ouverte', 'En cours'] as string[] } } },
    },
  },
  factures: {
    where: { statut: { in: unpaidFactureStatuts() } },
    select: {
      statut: true,
      totalTTC: true,
      paiements: { select: { montant: true, type: true } },
    },
  },
  commandes: {
    where: { reste: { gt: 0 } },
    select: { reste: true },
  },
};

const clientDetailInclude = {
  devis: {
    orderBy: { createdAt: 'desc' as const },
    take: 20,
    select: { id: true, numero: true, statut: true, totalTTC: true, totalHT: true, createdAt: true },
  },
  commandes: {
    orderBy: { createdAt: 'desc' as const },
    take: 20,
    select: {
      id: true,
      numero: true,
      statut: true,
      total: true,
      reste: true,
      article: true,
      avancement: true,
      createdAt: true,
    },
  },
  factures: {
    orderBy: { createdAt: 'desc' as const },
    take: 15,
    select: {
      id: true,
      numero: true,
      statut: true,
      totalTTC: true,
      createdAt: true,
      paiements: { select: { montant: true, type: true } },
    },
  },
  paiements: {
    orderBy: { datePaiement: 'desc' as const },
    take: 15,
    select: { id: true, numero: true, montant: true, type: true, mode: true, datePaiement: true },
  },
};

export const clientsRepository = {
  count(where: Record<string, unknown>) {
    return prisma.client.count({ where });
  },

  findMany(where: Record<string, unknown>, opts: { skip: number; take: number }) {
    return prisma.client.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: opts.skip,
      take: opts.take,
    });
  },

  findManyEnriched(where: Record<string, unknown>, pagination?: { skip: number; take: number }) {
    return prisma.client.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: clientListInclude,
      ...(pagination ? { skip: pagination.skip, take: pagination.take } : {}),
    });
  },

  async getCaTotalsByClientIds(clientIds: string[]): Promise<Record<string, number>> {
    if (!clientIds.length) return {};
    const caRows = await prisma.paiement.groupBy({
      by: ['clientId'],
      where: { clientId: { in: clientIds }, type: { not: 'Remboursement' } },
      _sum: { montant: true },
    });
    return Object.fromEntries(caRows.map((r) => [r.clientId, r._sum.montant ?? 0]));
  },

  async getSummary() {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const [actifs, vip, nouveauxMois, reclamations, total] = await Promise.all([
      prisma.client.count({ where: { archived: false, statut: ClientStatut.Actif } }),
      prisma.client.count({ where: { archived: false, statut: { in: fideleClientStatuts() } } }),
      prisma.client.count({ where: { archived: false, createdAt: { gte: monthStart } } }),
      prisma.clientReclamation.count({ where: { statut: { in: ['Ouverte', 'En cours'] } } }).catch(() => 0),
      prisma.client.count({ where: { archived: false } }),
    ]);
    return { total, actifs, vip, nouveauxMois, reclamations };
  },

  findById(id: string) {
    return prisma.client.findUnique({ where: { id } });
  },

  findByIdWithDetail(id: string) {
    return prisma.client.findUnique({
      where: { id },
      include: clientDetailInclude,
    });
  },

  findByIdWithLinkCounts(id: string) {
    return prisma.client.findUnique({
      where: { id },
      include: { _count: { select: { factures: true, paiements: true, commandes: true } } },
    });
  },

  create(data: Parameters<typeof prisma.client.create>[0]['data']) {
    return prisma.client.create({ data });
  },

  update(id: string, data: Parameters<typeof prisma.client.update>[0]['data']) {
    return prisma.client.update({ where: { id }, data });
  },

  archive(id: string) {
    return prisma.client.update({
      where: { id },
      data: { archived: true, archivedAt: new Date(), statut: ClientStatut.Archive },
    });
  },

  restore(id: string, statut: ClientStatut) {
    return prisma.client.update({
      where: { id },
      data: { archived: false, archivedAt: null, statut },
    });
  },

  searchActive(query: string, take = 25) {
    return prisma.client.findMany({
      where: {
        archived: false,
        OR: [
          { name: containsQ(query) },
          { email: containsQ(query) },
          { tel: containsQ(query) },
          { code: containsQ(query) },
          { nif: containsQ(query) },
          { commercialName: containsQ(query) },
          { adresse: containsQ(query) },
          { ville: containsQ(query) },
          { charte: containsQ(query) },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take,
      select: {
        id: true,
        code: true,
        name: true,
        tel: true,
        email: true,
        nif: true,
        commercialName: true,
        adresse: true,
        ville: true,
        charte: true,
        ca: true,
        cmds: true,
        statut: true,
        type: true,
      },
    });
  },
};
