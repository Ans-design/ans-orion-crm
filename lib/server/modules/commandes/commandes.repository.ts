import { prisma } from '@/lib/server/db/prisma';
import { containsQ } from '@/lib/prisma-filters';
import { buildTextSearchOr } from '@/lib/server/search/text-search';
import { CommandeStatut } from '@prisma/client';
import {
  activeProductionCommandeStatuts,
  commandeStatutFromLabel,
  completedCommandeStatuts,
} from '@/lib/server/data/prisma-statut-bridge';

export type CommandeListFilters = {
  search?: string;
  statut?: string;
  resteAPayer?: boolean;
  urgente?: boolean;
  createdFrom?: Date;
  createdTo?: Date;
  ids?: string[];
  trash?: boolean;
};

export function buildCommandeWhere(filters: CommandeListFilters) {
  const where: Record<string, unknown> = {
    archived: filters.trash === true,
  };
  if (filters.statut && filters.statut !== 'tous') {
    where.statut = commandeStatutFromLabel(filters.statut);
  }
  if (filters.resteAPayer && !filters.ids) where.reste = { gt: 0 };
  if (filters.ids !== undefined) {
    where.id = filters.ids.length > 0 ? { in: filters.ids } : { in: [] };
  }
  if (filters.urgente) where.priorite = 'Urgente';
  const searchOr = buildTextSearchOr(filters.search, [
    (q) => ({ numero: containsQ(q) }),
    (q) => ({ article: containsQ(q) }),
    (q) => ({ client: { name: containsQ(q) } }),
    (q) => ({ client: { tel: containsQ(q) } }),
    (q) => ({ client: { whatsapp: containsQ(q) } }),
    (q) => ({ client: { code: containsQ(q) } }),
  ]);
  if (searchOr) where.OR = searchOr;
  if (filters.createdFrom || filters.createdTo) {
    where.createdAt = {
      ...(filters.createdFrom ? { gte: filters.createdFrom } : {}),
      ...(filters.createdTo ? { lte: filters.createdTo } : {}),
    };
  }
  return where;
}

const commandeListInclude = {
  client: { select: { id: true, name: true, code: true } },
  devis: { select: { id: true, numero: true } },
  lignes: { orderBy: { sortOrder: 'asc' as const }, take: 5 },
  proofs: { select: { statut: true }, take: 3 },
  _count: { select: { lignes: true, factures: true, livraisons: true, productionDossiers: true } },
};

const commandeDetailInclude = {
  client: true,
  devis: { include: { lignes: true } },
  lignes: { orderBy: { sortOrder: 'asc' as const } },
};

const commandeUpdateInclude = {
  client: { select: { id: true, name: true, code: true } },
  devis: { select: { id: true, numero: true } },
};

export const commandesRepository = {
  count(where: Record<string, unknown>) {
    return prisma.commande.count({ where });
  },

  findById(id: string) {
    return prisma.commande.findUnique({ where: { id } });
  },

  findByIdWithListInclude(id: string) {
    return prisma.commande.findUnique({
      where: { id },
      include: commandeUpdateInclude,
    });
  },

  update(id: string, data: Parameters<typeof prisma.commande.update>[0]['data']) {
    return prisma.commande.update({
      where: { id },
      data,
      include: commandeUpdateInclude,
    });
  },

  findManyEnriched(where: Record<string, unknown>, pagination?: { skip: number; take: number }) {
    return prisma.commande.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: commandeListInclude,
      ...(pagination ? { skip: pagination.skip, take: pagination.take } : {}),
    });
  },

  findIdsAndTotals(where: Record<string, unknown>) {
    return prisma.commande.findMany({
      where,
      select: { id: true, total: true },
    });
  },

  findByIdWithDetail(id: string) {
    return prisma.commande.findUnique({
      where: { id },
      include: commandeDetailInclude,
    });
  },

  async getSummary(dateRange?: { from?: Date; to?: Date }) {
    const where: Record<string, unknown> = {};
    if (dateRange?.from || dateRange?.to) {
      where.createdAt = {
        ...(dateRange.from ? { gte: dateRange.from } : {}),
        ...(dateRange.to ? { lte: dateRange.to } : {}),
      };
    }
    const rows = await prisma.commande.findMany({
      where,
      select: { statut: true, dateLiv: true, total: true, reste: true, priorite: true },
    });
    const now = new Date();
    const done = new Set(completedCommandeStatuts());
    const inProgress = new Set(activeProductionCommandeStatuts());
    return {
      total: rows.length,
      enCours: rows.filter((c) => inProgress.has(c.statut)).length,
      enRetard: rows.filter(
        (c) =>
          c.statut === CommandeStatut.En_retard || (c.dateLiv && c.dateLiv < now && !done.has(c.statut)),
      ).length,
      aPlanifier: rows.filter((c) => c.statut === CommandeStatut.A_planifier).length,
      livrees: rows.filter((c) => c.statut === CommandeStatut.Livre || c.statut === CommandeStatut.Livree).length,
      caTotal: rows.reduce((s, c) => s + (c.total || 0), 0),
      resteAPayer: rows.reduce((s, c) => s + (c.reste || 0), 0),
      urgentes: rows.filter((c) => c.priorite === 'Urgente').length,
      resteAPayerCount: rows.filter((c) => (c.reste || 0) > 0).length,
    };
  },
};
