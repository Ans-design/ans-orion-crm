import { prisma } from '@/lib/prisma';
import {
  commandesSansDevisExcludedStatuts,
  completedCommandeStatuts,
  pendingDevisStatuts,
} from '@/lib/server/data/prisma-statut-bridge';

import { computePaidTotal } from '@/lib/finance/payment-totals';
export async function getOpsRealtimeExtended() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const [
    commandesRecent,
    commandesForPeak,
    etapesPlanning,
    topVilles,
    paiementsMonth,
    paiementsLastMonth,
    recentAnnonces,
    devisEnAttenteList,
    commandesSansDevis,
    paiementsByModeRaw,
    rhPresent,
    rhRetards,
  ] = await Promise.all([
    prisma.commande.findMany({
      where: { statut: { notIn: [...completedCommandeStatuts()] } },
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: {
        id: true,
        numero: true,
        article: true,
        statut: true,
        avancement: true,
        priorite: true,
        total: true,
        client: { select: { name: true, ville: true } },
      },
    }),
    prisma.commande.findMany({
      where: { createdAt: { gte: weekStart } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: 2000,
    }),
    prisma.productionEtape.findMany({
      where: {
        statut: { in: ['À faire', 'En cours'] },
        dureeMin: { not: null },
      },
      select: { dureeMin: true },
    }),
    prisma.client.groupBy({
      by: ['ville'],
      where: { archived: false, NOT: { ville: null } },
      _count: true,
      orderBy: { _count: { ville: 'desc' } },
      take: 10,
    }),
    prisma.paiement.findMany({
      where: { datePaiement: { gte: monthStart } },
      select: { montant: true, type: true },
      take: 5000,
    }),
    prisma.paiement.findMany({
      where: { datePaiement: { gte: lastMonthStart, lte: lastMonthEnd } },
      select: { montant: true, type: true },
      take: 5000,
    }),
    prisma.rhAnnouncement.findMany({
      where: { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: 6,
      select: {
        id: true,
        title: true,
        content: true,
        priority: true,
        authorName: true,
        createdAt: true,
        pinned: true,
      },
    }),
    prisma.devis.findMany({
      where: { statut: { in: pendingDevisStatuts() } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        numero: true,
        statut: true,
        totalTTC: true,
        createdAt: true,
        client: { select: { name: true } },
      },
    }),
    prisma.commande.findMany({
      where: {
        devisId: null,
        statut: { notIn: commandesSansDevisExcludedStatuts() },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        numero: true,
        article: true,
        statut: true,
        total: true,
        createdAt: true,
        client: { select: { name: true } },
      },
    }),
    prisma.paiement.groupBy({
      by: ['mode'],
      where: { datePaiement: { gte: monthStart }, type: { not: 'Remboursement' } },
      _sum: { montant: true },
    }),
    prisma.employeePresence.count({
      where: {
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        statut: { in: ['Présent', 'Retard', 'Justifié'] },
      },
    }),
    prisma.employeePresence.count({
      where: {
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        statut: 'Retard',
      },
    }),
  ]);

  const peakHours = Array.from({ length: 24 }, (_, h) => ({
    hour: `${String(h).padStart(2, '0')}h`,
    count: 0,
  }));
  for (const c of commandesForPeak) {
    const h = new Date(c.createdAt).getHours();
    peakHours[h].count += 1;
  }

  const plannedWorkloadHours = Math.round(
    etapesPlanning.reduce((s, e) => s + (e.dureeMin ?? 0), 0) / 60,
  );

  const caMonth = computePaidTotal(paiementsMonth);
  const caLastMonth = computePaidTotal(paiementsLastMonth);
  const caProgressPct =
    caLastMonth > 0
      ? Math.round(((caMonth - caLastMonth) / caLastMonth) * 100)
      : caMonth > 0
        ? 100
        : 0;

  const paiementsByMode = paiementsByModeRaw
    .map((p) => ({ name: p.mode, value: p._sum.montant ?? 0 }))
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value);

  return {
    commandePeakHours: peakHours,
    plannedWorkloadHours,
    commandesEnCours: commandesRecent.map((c) => ({
      id: c.id,
      numero: c.numero,
      client: c.client?.name ?? '—',
      ville: c.client?.ville ?? '',
      article: c.article,
      statut: c.statut,
      avancement: c.avancement,
      priorite: c.priorite,
      total: c.total,
    })),
    topVillesClients: topVilles
      .filter((v) => v.ville?.trim())
      .map((v) => ({ name: v.ville!, value: v._count })),
    caProgressPct,
    caMonth,
    recentAnnonces,
    devisEnAttenteList: devisEnAttenteList.map((d) => ({
      id: d.id,
      numero: d.numero,
      client: d.client?.name ?? '—',
      statut: d.statut,
      totalTTC: d.totalTTC,
      createdAt: d.createdAt,
    })),
    commandesSansDevis,
    paiementsByMode,
    rhPointage: {
      presentsToday: rhPresent,
      retardsToday: rhRetards,
    },
  };
}
