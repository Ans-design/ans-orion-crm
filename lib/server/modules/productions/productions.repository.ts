import { prisma } from '@/lib/server/db/prisma';
import { containsQ } from '@/lib/prisma-filters';
import type { Prisma } from '@prisma/client';
import type { CreateProductionInput, ProductionListQuery, UpdateProductionInput } from './productions.validation';

export function buildProductionWhere(query: Pick<ProductionListQuery, 'search' | 'statut' | 'commandeId'>) {
  const where: Record<string, unknown> = {};
  if (query.statut) where.statut = query.statut;
  if (query.commandeId) where.commandeId = query.commandeId;
  if (query.search) {
    where.OR = [
      { commande: { numero: containsQ(query.search) } },
      { commande: { article: containsQ(query.search) } },
      { operateur: containsQ(query.search) },
    ];
  }
  return where;
}

const listInclude = {
  commande: { include: { client: true } },
  etapes: { orderBy: { ordre: 'asc' as const } },
};

export const productionsRepository = {
  findMany(where: Record<string, unknown>, pagination?: { skip: number; take: number }) {
    return prisma.production.findMany({
      where,
      include: listInclude,
      orderBy: { createdAt: 'desc' },
      ...(pagination ?? {}),
    });
  },

  count(where: Record<string, unknown>) {
    return prisma.production.count({ where });
  },

  findById(id: string) {
    return prisma.production.findUnique({
      where: { id },
      include: listInclude,
    });
  },

  create(data: CreateProductionInput & { etapes: { nom: string; ordre: number }[] }) {
    const { commandeId, priorite, operateur, machine, notes, etapes } = data;
    return prisma.production.create({
      data: {
        commandeId,
        statut: 'En cours',
        priorite: priorite || 'Normal',
        operateur: operateur || null,
        machine: machine || null,
        notes: notes || null,
        etapes: {
          create: etapes.map((e, i) => ({ nom: e.nom, ordre: e.ordre ?? i + 1 })),
        },
      },
      include: listInclude,
    });
  },

  update(id: string, data: Prisma.ProductionUpdateInput) {
    return prisma.production.update({
      where: { id },
      data,
      include: listInclude,
    });
  },

  findEtape(etapeId: string) {
    return prisma.productionEtape.findUnique({
      where: { id: etapeId },
      select: { id: true, nom: true, productionId: true, statut: true },
    });
  },

  updateEtape(etapeId: string, data: Record<string, unknown>) {
    return prisma.productionEtape.update({ where: { id: etapeId }, data });
  },

  listEtapes(productionId: string) {
    return prisma.productionEtape.findMany({
      where: { productionId },
      orderBy: { ordre: 'asc' },
    });
  },
};
