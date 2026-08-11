import { prisma } from '@/lib/prisma';
import {
  activeLivraisonPipelineStatuts,
  commandeRetardStatut,
  completedCommandeStatuts,
  pendingDevisStatuts,
} from '@/lib/server/data/prisma-statut-bridge';
import { getStockAlerts } from '@/lib/services/stock-service';
import { getMetierTaskStats } from '@/lib/services/metier-task-service';
import { getUnreadTalkCount } from '@/lib/messaging/messaging-service';
import type { NavBadgeCounts } from './nav-badges-shared';

export type { NavBadgeCounts, NavBadgeKey } from './nav-badges-shared';

/** Compteurs légers pour badges sidebar — uniquement signaux actionnables (server-only) */
export async function getNavBadgeCounts(userId?: string): Promise<NavBadgeCounts> {
  const now = new Date();

  const [
    commandes,
    devis,
    reclamations,
    ansTalk,
    stockAlerts,
    taskStats,
    livraisons,
  ] = await Promise.all([
    prisma.commande
      .count({
        where: {
          OR: [
            { priorite: 'Urgente', statut: { notIn: [...completedCommandeStatuts()] } },
            { statut: commandeRetardStatut() },
            { dateLiv: { lt: now }, statut: { notIn: [...completedCommandeStatuts()] } },
          ],
        },
      })
      .catch(() => 0),
    prisma.devis
      .count({ where: { statut: { in: pendingDevisStatuts() } } })
      .catch(() => 0),
    prisma.clientReclamation
      .count({ where: { statut: { in: ['Ouverte', 'En cours'] } } })
      .catch(() => 0),
    userId ? getUnreadTalkCount(userId).catch(() => 0) : Promise.resolve(0),
    getStockAlerts().then((items) => items.length).catch(() => 0),
    getMetierTaskStats().then((s) => s.totalOpen).catch(() => 0),
    prisma.livraison
      .count({ where: { statut: { in: activeLivraisonPipelineStatuts() } } })
      .catch(() => 0),
  ]);

  return {
    commandes,
    devis,
    reclamations,
    ansTalk,
    stockAlerts,
    tasksOpen: taskStats,
    livraisons,
  };
}
