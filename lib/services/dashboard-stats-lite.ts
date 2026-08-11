/**
 * Dashboard lite — KPIs + listes récentes (premier paint fluide).
 * Uniquement Prisma léger — pas de services lourds (stock alerts, finance-adv, GPAO full).
 */
import { prisma } from '@/lib/prisma';
import { buildOperationalAlerts } from '@/lib/cockpit/build-alerts';
import type { ModuleDatePeriod } from '@/lib/date-filter';
import {
  acceptedDevisStatut,
  brouillonDevisStatut,
  cancelledCommandeStatuts,
  completedCommandeStatuts,
  completedLivraisonStatuts,
  commandeRetardStatut,
  isUnpaidFactureStatut,
  pendingDevisStatuts,
  unpaidFactureStatuts,
  planifierCommandeStatuts,
} from '@/lib/server/data/prisma-statut-bridge';
import { computePaidTotal } from '@/lib/finance/payment-totals';
import { resolveBusinessPeriod } from '@/lib/kpi/business-clock';
import { emptyDashboardStats } from '@/lib/dashboard-fallback';

function commandeDateWhere(dateRange?: { from?: Date; to?: Date }) {
  if (!dateRange?.from && !dateRange?.to) return {};
  return {
    createdAt: {
      ...(dateRange.from && { gte: dateRange.from }),
      ...(dateRange.to && { lte: dateRange.to }),
    },
  };
}

export async function getDashboardLiteStats(
  period: ModuleDatePeriod = 'week',
  dateRange?: { from?: Date; to?: Date },
) {
  const now = new Date();
  const dayP = resolveBusinessPeriod({ preset: 'day', now });
  const weekP = resolveBusinessPeriod({ preset: 'week', now });
  const monthP = resolveBusinessPeriod({ preset: 'month', now });
  const yearP = resolveBusinessPeriod({ preset: 'year', now });
  const todayStart = dayP.from;
  const weekStart = weekP.from;
  const monthStart = monthP.from;
  const yearStart = yearP.from;

  const [
    clients,
    devisGroup,
    cmdActivesCount,
    cmdRetardCount,
    cmdUrgentesCount,
    commandesPeriodeActives,
    productions,
    factures,
    paiementsPeriode,
    paiementsWeek,
    recentPaiements,
    livraisonsPrevues,
    recentCmds,
    recentAudit,
    paiementsToday,
    paiementsYear,
    proofsPending,
    stockCritique,
    machinesDown,
    cmdAPlanifier,
    rhPresents,
    rhRetards,
    rhActifs,
    gpaoBloques,
    gpaoTotal,
  ] = await Promise.all([
    prisma.client.count({ where: { archived: false } }),
    prisma.devis.groupBy({ by: ['statut'], _count: { _all: true } }).catch(() => []),
    prisma.commande.count({ where: { statut: { notIn: [...completedCommandeStatuts()] } } }),
    prisma.commande.count({
      where: {
        OR: [
          { statut: commandeRetardStatut() },
          { priorite: 'Urgente', statut: { notIn: [...completedCommandeStatuts()] } },
          { dateLiv: { lt: now }, statut: { notIn: [...completedCommandeStatuts()] } },
        ],
      },
    }),
    prisma.commande.count({
      where: { priorite: 'Urgente', statut: { notIn: [...completedCommandeStatuts()] } },
    }),
    prisma.commande.aggregate({
      where: {
        ...commandeDateWhere(dateRange),
        statut: { notIn: cancelledCommandeStatuts() },
      },
      _sum: { total: true },
    }),
    prisma.production.count({ where: { statut: { notIn: ['Terminé', 'Terminée'] } } }),
    prisma.facture.findMany({
      where: { statut: { in: unpaidFactureStatuts() } },
      select: {
        statut: true,
        totalTTC: true,
        dateEcheance: true,
        paiements: { select: { montant: true, type: true } },
      },
    }),
    prisma.paiement.findMany({
      where: {
        ...(dateRange?.from || dateRange?.to
          ? {
              datePaiement: {
                ...(dateRange.from ? { gte: dateRange.from } : {}),
                ...(dateRange.to ? { lte: dateRange.to } : {}),
              },
            }
          : { datePaiement: { gte: monthStart } }),
      },
      select: { montant: true, type: true },
    }),
    prisma.paiement.findMany({
      where: { datePaiement: { gte: weekStart } },
      select: { montant: true, type: true },
    }),
    prisma.paiement.findMany({
      orderBy: { datePaiement: 'desc' },
      take: 5,
      select: {
        id: true,
        montant: true,
        mode: true,
        datePaiement: true,
        commandeId: true,
        client: { select: { name: true } },
        facture: { select: { numero: true, commandeId: true } },
      },
    }).catch(() => []),
    prisma.livraison.findMany({
      where: {
        statut: { notIn: completedLivraisonStatuts() },
        datePrevue: { gte: todayStart },
      },
      orderBy: { datePrevue: 'asc' },
      take: 5,
      include: { client: { select: { name: true } }, commande: { select: { numero: true } } },
    }),
    prisma.commande.findMany({
      where: { statut: { notIn: [...completedCommandeStatuts()] } },
      select: {
        id: true,
        numero: true,
        article: true,
        statut: true,
        priorite: true,
        avancement: true,
        client: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        action: true,
        entity: true,
        entityId: true,
        entityLabel: true,
        userName: true,
        createdAt: true,
      },
    }),
    prisma.paiement.findMany({
      where: { datePaiement: { gte: todayStart } },
      select: { montant: true, type: true },
    }),
    prisma.paiement.findMany({
      where: { datePaiement: { gte: yearStart } },
      select: { montant: true, type: true },
    }),
    prisma.proof.count({ where: { statut: { in: ['En attente', 'Envoyé'] } } }).catch(() => 0),
    prisma.stockItem.count({
      where: { actif: true, archived: false, quantity: { lte: 50 } },
    }).catch(() => 0),
    prisma.machine.count({ where: { status: 'down' } }).catch(() => 0),
    prisma.commande.count({
      where: { statut: { in: [...planifierCommandeStatuts()] } },
    }).catch(() => 0),
    prisma.employeePresence.count({
      where: {
        date: { gte: todayStart },
        checkIn: { not: null },
      },
    }).catch(() => 0),
    prisma.employeePresence.count({
      where: {
        date: { gte: todayStart },
        retardMin: { gt: 0 },
      },
    }).catch(() => 0),
    prisma.employee.count({ where: { statut: 'Actif' } }).catch(() => 0),
    prisma.productionDossier.count({ where: { statutGlobal: { in: ['Bloqué', 'Bloquee', 'Bloquée'] } } }).catch(() => 0),
    prisma.productionDossier.count().catch(() => 0),
  ]);

  const stockCritiqueN = typeof stockCritique === 'number' ? stockCritique : 0;

  const devisCountByStatut = Object.fromEntries(devisGroup.map((g) => [g.statut, g._count._all]));
  const caDay = computePaidTotal(paiementsToday);
  const caWeek = computePaidTotal(paiementsWeek);
  const caMonth = computePaidTotal(paiementsPeriode);
  const caYear = computePaidTotal(paiementsYear);
  const devisEnAttente = pendingDevisStatuts().reduce((s, st) => s + (devisCountByStatut[st] ?? 0), 0);
  const devisAcceptes = devisCountByStatut[acceptedDevisStatut()] ?? 0;
  const devisConversionDenom = Object.entries(devisCountByStatut)
    .filter(([st]) => st !== brouillonDevisStatut())
    .reduce((s, [, n]) => s + n, 0);
  const tauxConversion =
    devisConversionDenom > 0 ? Math.round((devisAcceptes / devisConversionDenom) * 100) : 0;

  const unpaidRows = factures.filter((f) => isUnpaidFactureStatut(f.statut));
  const facturesImpayees = unpaidRows.reduce(
    (s, f) => s + Math.max(0, (f.totalTTC ?? 0) - computePaidTotal(f.paiements)),
    0,
  );
  const facturesEnRetard = unpaidRows.filter(
    (f) => f.dateEcheance && f.dateEcheance < now,
  ).length;

  const caCommandesMonth = Math.round(commandesPeriodeActives._sum.total ?? 0);
  const caHighlight =
    period === 'day' ? caDay : period === 'month' ? caMonth : period === 'year' ? caYear : caWeek;

  const alertes = buildOperationalAlerts({
    cmdRetard: cmdRetardCount,
    cmdUrgentes: cmdUrgentesCount,
    facturesEnRetard,
    devisEnAttente,
    proofsPending: proofsPending ?? 0,
    stockCritique: stockCritiqueN,
    absencesPending: 0,
    retardsToday: rhRetards,
    tasksBlocked: 0,
    tasksTodayDue: 0,
    reclamationsOuvertes: 0,
    machinesDown,
    gpaoBloques,
    gpaoIncidents: 0,
    tresorerieNegative: false,
  });

  const base = emptyDashboardStats(period);

  return {
    ...base,
    emptyDatabase: false,
    period,
    computedAt: now.toISOString(),
    chartsPeriodLabel: 'Ouvrir analyses pour graphiques',
    kpis: {
      ...base.kpis,
      caDay,
      caWeek,
      caMonth,
      caYear,
      caHighlight,
      devisEnAttente,
      devisAcceptes,
      tauxConversion,
      cmdActives: cmdActivesCount,
      enProduction: productions,
      clients,
      cmdRetard: cmdRetardCount,
      facturesImpayees,
      facturesEnRetard,
      livraisonsEnCours: livraisonsPrevues.length,
      paiementsRecusJour: caDay,
      cmdUrgentes: cmdUrgentesCount,
      stockCritique: stockCritiqueN,
      batEnAttente: proofsPending ?? 0,
      machinesDown,
      cmdAPlanifier,
      rhActifs,
      rhPresents,
      rhRetards,
      impayesClients: facturesImpayees,
      dossiersGpao: gpaoTotal,
      dossiersBloques: gpaoBloques,
      caCommandesMonth,
      /** DSH-01 : jamais assimiler trésorerie = CA — null jusqu’au full stats */
      tresorerieMois: null as unknown as number,
    },
    alertes,
    recentCmds: recentCmds.map((c) => ({
      id: c.id,
      numero: c.numero ?? undefined,
      client: c.client?.name ?? '—',
      article: c.article ?? '—',
      statut: c.statut,
      avancement: c.avancement ?? 0,
      priorite: c.priorite ?? 'Normale',
    })),
    recentPaiements: recentPaiements.map((p) => ({
      id: p.id,
      commandeId: p.commandeId ?? p.facture?.commandeId ?? null,
      montant: p.montant,
      mode: p.mode,
      client: p.client?.name || '—',
      facture: p.facture?.numero,
      date: p.datePaiement.toISOString(),
    })),
    livraisonsPrevues: livraisonsPrevues.map((l) => ({
      id: l.id,
      numero: l.numero ?? undefined,
      client: l.client?.name || '—',
      commande: l.commande?.numero,
      statut: l.statut,
      datePrevue: l.datePrevue?.toISOString(),
    })),
    recentAudit,
    rhPointage: {
      presentsToday: rhPresents,
      retardsToday: rhRetards,
    },
    kpiDrawerHints: {
      commande: recentCmds[0]?.id,
    },
    _lite: true as const,
  };
}
