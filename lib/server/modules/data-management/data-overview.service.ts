import { prisma } from '@/lib/server/db/prisma';
import { Prisma } from '@prisma/client';
import { acceptedDevisStatut, inactifClientStatut } from '@/lib/server/data/prisma-statut-bridge';

export type DataManagementOverview = {
  generatedAt: string;
  volumes: {
    clients: number;
    clientsActifs: number;
    devis: number;
    commandes: number;
    factures: number;
    paiements: number;
    livraisons: number;
    stockItems: number;
    productions: number;
  };
  snapshots: {
    commandesSansPaymentSnapshot: number;
    devisAcceptesSansLogistics: number;
  };
  activity: {
    auditLast24h: number;
    commandesLast7d: number;
    paiementsLast7d: number;
  };
  qualityTrend: { scannedAt: string; totalAnomalies: number; critical: number; high: number }[];
  anomaliesByModule: { module: string; count: number }[];
};

import { getDataQualityTrend } from '@/lib/server/modules/data-quality/data-quality.service';

export async function getDataManagementOverview(): Promise<DataManagementOverview> {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    clients,
    clientsActifs,
    devis,
    commandes,
    factures,
    paiements,
    livraisons,
    stockItems,
    productions,
    commandesSansPaymentSnapshot,
    devisAcceptesSansLogistics,
    auditLast24h,
    commandesLast7d,
    paiementsLast7d,
    anomalyGroups,
    qualityTrend,
  ] = await Promise.all([
    prisma.client.count({ where: { archived: false } }),
    prisma.client.count({ where: { archived: false, statut: { not: inactifClientStatut() } } }),
    prisma.devis.count(),
    prisma.commande.count(),
    prisma.facture.count(),
    prisma.paiement.count(),
    prisma.livraison.count(),
    prisma.stockItem.count({ where: { actif: true } }),
    prisma.production.count(),
    prisma.commande.count({ where: { paymentSnapshot: { equals: Prisma.DbNull } } }),
    prisma.devis.count({ where: { statut: acceptedDevisStatut(), logisticsSnapshot: { equals: Prisma.DbNull } } }),
    prisma.auditLog.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.commande.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.paiement.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.auditLog.groupBy({
      by: ['entity'],
      where: {
        createdAt: { gte: weekAgo },
        action: { in: ['UPDATE', 'STATUS_CHANGE', 'CREATE', 'DELETE', 'ARCHIVE'] },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 8,
    }),
    getDataQualityTrend(10),
  ]);

  const anomaliesByModule = anomalyGroups.map((r) => ({
    module: r.entity,
    count: r._count.id,
  }));

  return {
    generatedAt: now.toISOString(),
    volumes: {
      clients,
      clientsActifs,
      devis,
      commandes,
      factures,
      paiements,
      livraisons,
      stockItems,
      productions,
    },
    snapshots: {
      commandesSansPaymentSnapshot,
      devisAcceptesSansLogistics,
    },
    activity: {
      auditLast24h,
      commandesLast7d,
      paiementsLast7d,
    },
    qualityTrend,
    anomaliesByModule,
  };
}
