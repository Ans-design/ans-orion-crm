import { prisma } from '@/lib/server/db/prisma';
import { containsQ } from '@/lib/prisma-filters';
import { livraisonStatutFromLabel } from '@/lib/server/data/prisma-statut-bridge';

import type { LivraisonListQuery } from './livraisons.validation';

export function buildLivraisonWhere(query: LivraisonListQuery) {
  const where: Record<string, unknown> = {
    archived: query.trash === true,
  };
  if (query.statut) where.statut = livraisonStatutFromLabel(query.statut);
  if (query.commandeId) where.commandeId = query.commandeId;
  if (query.livreur) where.livreur = query.livreur;
  if (query.search) {
    where.OR = [
      { numero: containsQ(query.search) },
      { livreur: containsQ(query.search) },
      { commande: { numero: containsQ(query.search) } },
      { client: { name: containsQ(query.search) } },
    ];
  }
  return where;
}

const livraisonListInclude = {
  commande: {
    select: {
      id: true,
      numero: true,
      article: true,
      total: true,
      reste: true,
      client: { select: { id: true, name: true } },
    },
  },
  client: { select: { id: true, name: true } },
};

const livraisonDetailInclude = {
  commande: { include: { client: true } },
  client: true,
};

export const livraisonsRepository = {
  findMany(where: Record<string, unknown>) {
    return prisma.livraison.findMany({
      where,
      include: livraisonListInclude,
      orderBy: { createdAt: 'desc' },
    });
  },

  findById(id: string) {
    return prisma.livraison.findUnique({ where: { id } });
  },

  findByIdWithDetail(id: string) {
    return prisma.livraison.findUnique({
      where: { id },
      include: livraisonDetailInclude,
    });
  },

  findCommandeClient(commandeId: string) {
    return prisma.commande.findUnique({
      where: { id: commandeId },
      select: { id: true, clientId: true },
    });
  },

  create(data: Parameters<typeof prisma.livraison.create>[0]['data']) {
    return prisma.livraison.create({
      data,
      include: livraisonDetailInclude,
    });
  },

  update(id: string, data: Parameters<typeof prisma.livraison.update>[0]['data']) {
    return prisma.livraison.update({
      where: { id },
      data,
      include: livraisonDetailInclude,
    });
  },
};
