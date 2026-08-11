import { prisma } from '@/lib/server/db/prisma';
import { containsQ } from '@/lib/prisma-filters';
import { buildTextSearchOr } from '@/lib/server/search/text-search';
import {
  devisStatutFromLabel,
  devisExpiryWatchStatuts,
  pendingDevisStatuts,
} from '@/lib/server/data/prisma-statut-bridge';
import { DevisStatut, type Prisma } from '@prisma/client';

export type DevisListFilters = {
  search?: string;
  statut?: string;
  stagnant?: boolean;
  stagnantBefore?: Date;
  trash?: boolean;
};

export function buildDevisWhere(filters: DevisListFilters) {
  const where: Record<string, unknown> = {
    archived: filters.trash === true,
  };
  if (filters.stagnant) {
    where.statut = { in: devisExpiryWatchStatuts() };
    if (filters.stagnantBefore) {
      where.createdAt = { lte: filters.stagnantBefore };
    }
  } else if (filters.statut && filters.statut !== 'tous') {
    where.statut = devisStatutFromLabel(filters.statut);
  }
  const searchOr = buildTextSearchOr(filters.search, [
    (q) => ({ numero: containsQ(q) }),
    (q) => ({ client: { name: containsQ(q) } }),
  ]);
  if (searchOr) where.OR = searchOr;
  return where;
}

const devisListInclude = {
  client: { select: { id: true, name: true, code: true } },
  lignes: { orderBy: { sortOrder: 'asc' as const } },
  _count: { select: { commandes: true } },
};

const devisDetailInclude = {
  client: true,
  lignes: { orderBy: { sortOrder: 'asc' as const } },
  commandes: { orderBy: { createdAt: 'desc' as const } },
};

export const devisRepository = {
  count(where: Record<string, unknown>) {
    return prisma.devis.count({ where });
  },

  findManyWithRelations(
    where: Record<string, unknown>,
    pagination?: { skip: number; take: number },
    orderBy?: Prisma.DevisOrderByWithRelationInput | Prisma.DevisOrderByWithRelationInput[],
  ) {
    return prisma.devis.findMany({
      where,
      orderBy: orderBy ?? { createdAt: 'desc' },
      include: devisListInclude,
      ...(pagination ? { skip: pagination.skip, take: pagination.take } : {}),
    });
  },

  findByIdWithDetail(id: string) {
    return prisma.devis.findUnique({
      where: { id },
      include: devisDetailInclude,
    });
  },

  findByIdWithCommandeCount(id: string) {
    return prisma.devis.findUnique({
      where: { id },
      include: { _count: { select: { commandes: true } } },
    });
  },

  create(data: Parameters<typeof prisma.devis.create>[0]['data']) {
    return prisma.devis.create({
      data,
      include: {
        client: { select: { id: true, name: true, code: true } },
        lignes: { orderBy: { sortOrder: 'asc' } },
      },
    });
  },

  update(id: string, data: Parameters<typeof prisma.devis.update>[0]['data']) {
    return prisma.devis.update({
      where: { id },
      data,
      include: {
        client: { select: { id: true, name: true, code: true } },
        lignes: { orderBy: { sortOrder: 'asc' } },
      },
    });
  },

  async deleteWithLignes(id: string) {
    await prisma.devisLigne.deleteMany({ where: { devisId: id } });
    await prisma.devis.delete({ where: { id } });
  },

  softArchive(id: string, userId?: string | null) {
    return prisma.devis.update({
      where: { id },
      data: {
        archived: true,
        archivedAt: new Date(),
        archivedBy: userId ?? null,
      } as never,
    });
  },

  restore(id: string) {
    return prisma.devis.update({
      where: { id },
      data: {
        archived: false,
        archivedAt: null,
        archivedBy: null,
      } as never,
    });
  },

  async getSummary() {
    const rows = await prisma.devis.findMany({
      where: { archived: false } as never,
      select: { statut: true, totalHT: true, createdAt: true, validUntil: true },
    });
    const pending = new Set(pendingDevisStatuts());
    const stagnantCutoff = new Date();
    stagnantCutoff.setDate(stagnantCutoff.getDate() - 7);
    const expirySoon = new Date();
    expirySoon.setDate(expirySoon.getDate() + 5);
    return {
      total: rows.length,
      enAttente: rows.filter((d) => pending.has(d.statut)).length,
      acceptes: rows.filter((d) => d.statut === DevisStatut.Accepte).length,
      montantTotal: rows.filter((d) => d.statut === DevisStatut.Accepte).reduce((s, d) => s + d.totalHT, 0),
      stagnants: rows.filter((d) => devisExpiryWatchStatuts().includes(d.statut) && d.createdAt <= stagnantCutoff).length,
      expirantBientot: rows.filter((d) => devisExpiryWatchStatuts().includes(d.statut) && d.validUntil && d.validUntil >= new Date() && d.validUntil <= expirySoon).length,
    };
  },

  findByIdWithLignes(id: string) {
    return prisma.devis.findUnique({
      where: { id },
      include: { lignes: { orderBy: { sortOrder: 'asc' } } },
    });
  },
};

export type DevisLigneCreateInput = {
  articleId: string;
  articleLabel: string;
  category: string;
  configSnapshot: Prisma.InputJsonValue;
  quantity: number;
  unite?: string;
  prixUnitaireAuto: number;
  prixUnitaireForce?: number | null;
  totalForce?: number | null;
  totalLigne: number;
  pricingMode?: string;
  priceReason?: string | null;
  remarks?: string | null;
  sortOrder: number;
};
