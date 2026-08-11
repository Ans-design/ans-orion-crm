import { prisma } from '@/lib/prisma';
import { getStockAlerts } from '@/lib/services/stock-service';
import { getDirectorKpis } from '@/lib/services/ops-alerts';
import { getMetierTaskStats } from '@/lib/services/metier-task-service';
import { getRhStats } from '@/lib/services/rh-service';
import { getFinanceAdvStats } from '@/lib/services/finance-adv-service';
import { getGpaoStats } from '@/lib/services/gpao-dossier-service';
import { buildOperationalAlerts } from '@/lib/cockpit/build-alerts';
import {
  buildTopOrderedArticles,
  buildMachinesByStatus,
  buildCaByCommercial,
  type TopArticleData,
  type MachineStatusData,
  type CaByCommercialRow,
} from '@/lib/dashboard/chart-aggregations';
import {
  buildCaByCanal,
  buildCaByVille,
  buildClientsByVille,
  buildCaByCanalDecouverte,
} from '@/lib/dashboard/client-geography';
import { listInactiveClientsForRelance } from '@/lib/services/client-relance-service';
import { getOpsRealtimeExtended } from '@/lib/cockpit/ops-realtime-extended';
import { daysUntilDevisExpiry } from '@/lib/devis/devis-validity';
import { getCoutsRevient } from '@/lib/services/finance-adv-service';
import { MODULE_DATE_PRESETS, type ModuleDatePeriod } from '@/lib/date-filter';
import {
  activeLivraisonPipelineStatuts,
  acceptedDevisStatut,
  brouillonDevisStatut,
  cancelledCommandeStatuts,
  commandeRetardStatut,
  commandeStatutLabel,
  completedCommandeStatuts,
  completedLivraisonStatuts,
  devisExpiryWatchStatuts,
  devisStatutLabel,
  isUnpaidFactureStatut,
  livraisonStatutLabel,
  pendingDevisStatuts,
  shippedCommandeStatuts,
  unpaidFactureStatuts,
} from '@/lib/server/data/prisma-statut-bridge';
import { computePaidTotal } from '@/lib/finance/payment-totals';
import { getLiveImpayesParClient } from '@/lib/finance/kpi-live-aggregates';
import { computeCaForecast, forecastSummary } from '@/lib/cockpit/ca-forecast';
import {
  resolveBusinessPeriod,
  DEFAULT_BUSINESS_TIMEZONE,
  type BusinessPeriodPreset,
} from '@/lib/kpi/business-clock';
import { getKpiSourceWatermark } from '@/lib/kpi/invalidation-map';

function mapPeriodToClockPreset(period: ModuleDatePeriod): BusinessPeriodPreset {
  if (period === 'day' || period === 'week' || period === 'month' || period === 'year') return period;
  return 'week';
}

function commandeDateWhere(dateRange?: { from?: Date; to?: Date }) {
  if (!dateRange?.from && !dateRange?.to) return {};
  return {
    createdAt: {
      ...(dateRange.from && { gte: dateRange.from }),
      ...(dateRange.to && { lte: dateRange.to }),
    },
  };
}

/** Plage charts — évite scan complet si période « tout ». */
function chartCommandeDateWhere(dateRange?: { from?: Date; to?: Date }, ref = new Date()) {
  if (dateRange?.from || dateRange?.to) return commandeDateWhere(dateRange);
  const from = new Date(ref);
  from.setDate(from.getDate() - 90);
  return { createdAt: { gte: from, lte: ref } };
}

function buildPeriodLabel(period: ModuleDatePeriod, dateRange?: { from?: Date; to?: Date }): string {
  if (dateRange?.from && dateRange?.to) {
    return `${dateRange.from.toLocaleDateString('fr-FR')} — ${dateRange.to.toLocaleDateString('fr-FR')}`;
  }
  return MODULE_DATE_PRESETS.find((p) => p.id === period)?.label ?? 'Période sélectionnée';
}

export async function getDashboardStats(
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
  const partialReasons: string[] = [];
  void mapPeriodToClockPreset(period);
  void DEFAULT_BUSINESS_TIMEZONE;

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
    livraisonsGroup,
    recentCmds,
    recentAudit,
    topClientsRaw,
    paiementsToday,
    paiementsYear,
    proofsPending,
    stockAlerts,
    directorKpis,
    taskStats,
    rhStats,
    financeStats,
    gpaoStats,
    commandesGroup,
    chargesMonth,
    commandesForCharts,
    machinesAll,
    clientsForGeo,
    commandesGeo,
    devisWithValidity,
    inactiveClients,
    chargesHalfYear,
    paiementsHalfYear,
    opsExtended,
    cmCampagnesActives,
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
    prisma.commande.findMany({
      where: {
        ...commandeDateWhere(dateRange),
        statut: { notIn: cancelledCommandeStatuts() },
      },
      select: {
        statut: true, total: true, createdAt: true,
        client: { select: { commercialName: true } },
      },
      take: 200,
    }),
    prisma.production.count({ where: { statut: { notIn: ['Terminé', 'Terminée'] } } }),
    prisma.facture.findMany({
      where: { statut: { in: unpaidFactureStatuts() } },
      select: {
        statut: true,
        totalTTC: true,
        dateEcheance: true,
        clientId: true,
        paiements: { select: { montant: true, type: true } },
      },
      take: 500,
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
      select: { montant: true, type: true, datePaiement: true },
      // PERF-003 V10 : borne serveur (agrégats préférés ; pas 5000 lignes en mémoire)
      take: 800,
    }),
    prisma.paiement.findMany({
      where: { datePaiement: { gte: weekStart } },
      select: { montant: true, type: true, datePaiement: true },
      take: 400,
    }),
    prisma.paiement.findMany({
      orderBy: { datePaiement: 'desc' },
      take: 5,
      select: {
        id: true,
        montant: true,
        mode: true,
        type: true,
        datePaiement: true,
        commandeId: true,
        client: { select: { name: true } },
        facture: { select: { numero: true, commandeId: true } },
      },
    }).catch(() => {
      partialReasons.push('paiements_recent');
      return [];
    }),
    prisma.livraison.findMany({
      where: {
        statut: { notIn: completedLivraisonStatuts() },
        datePrevue: { gte: todayStart },
      },
      orderBy: { datePrevue: 'asc' },
      take: 5,
      include: { client: { select: { name: true } }, commande: { select: { numero: true } } },
    }),
    prisma.livraison.groupBy({ by: ['statut'], _count: true }),
    prisma.commande.findMany({
      where: { statut: { notIn: [...completedCommandeStatuts()] } },
      include: { client: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 6, select: { action: true, entity: true, entityId: true, entityLabel: true, userName: true, createdAt: true } }),
    prisma.paiement.groupBy({
      by: ['clientId'],
      where: { clientId: { not: null }, datePaiement: { gte: monthStart }, type: { not: 'Remboursement' } },
      _sum: { montant: true },
      orderBy: { _sum: { montant: 'desc' } },
      take: 5,
    }),
    prisma.paiement.findMany({
      where: { datePaiement: { gte: todayStart } },
      select: { montant: true, type: true },
    }),
    prisma.paiement.findMany({
      where: { datePaiement: { gte: yearStart } },
      select: { montant: true, type: true },
    }),
    prisma.proof.count({ where: { statut: { in: ['En attente', 'Envoyé'] } } }).catch(() => {
      partialReasons.push('bat');
      return null as number | null;
    }),
    getStockAlerts().catch(() => {
      partialReasons.push('stock');
      return [];
    }),
    getDirectorKpis().catch(() => {
      partialReasons.push('director');
      return {
        reclamationsOuvertes: 0,
        machinesDown: 0,
        machinesMaintSoon: 0,
        cmdAPlanifier: 0,
        batEnAttente: 0,
      };
    }),
    getMetierTaskStats().catch(() => {
      partialReasons.push('tasks');
      return { totalOpen: 0, blocked: 0, todayDue: 0, byType: {} };
    }),
    getRhStats().catch(() => {
      partialReasons.push('rh');
      return { totalActifs: 0, presentsToday: 0, retardsToday: 0, absencesPending: 0, announcements: 0, presentNow: 0 };
    }),
    getFinanceAdvStats(dateRange).catch(() => { partialReasons.push('finance'); return { entreesMois: 0, sortiesMois: 0, tresorerieMois: 0, depsDirectesMois: 0, depsDirectesCount: 0, chargesMois: 0, impayes: 0 }; }),
    getGpaoStats().catch(() => {
      partialReasons.push('gpao');
      return { total: 0, enCours: 0, bloques: 0, incidentsOuverts: 0, enRetard: 0 };
    }),
    prisma.commande.groupBy({ by: ['statut'], _count: true }),
    prisma.financeCharge.findMany({
      where: { dateCharge: { gte: monthStart } },
      select: { category: true, amount: true },
    }).catch(() => { partialReasons.push('charges'); return []; }),
    prisma.commande.findMany({
      where: chartCommandeDateWhere(dateRange, now),
      select: {
        id: true,
        article: true,
        qty: true,
        total: true,
        lignes: {
          select: {
            articleId: true,
            articleLabel: true,
            quantity: true,
            totalLigne: true,
            configSnapshot: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 250,
    }),
    prisma.machine.findMany({
      select: { id: true, name: true, status: true },
    }).catch(() => { partialReasons.push('machines'); return []; }),
    prisma.client.findMany({
      where: { archived: false },
      select: { ville: true },
    }),
    prisma.commande.findMany({
      where: chartCommandeDateWhere(dateRange, now),
      select: {
        total: true,
        client: { select: { ville: true, canalVente: true, canalDecouverte: true } },
        devis: { select: { notes: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 250,
    }),
    prisma.devis.findMany({
      where: { statut: { in: devisExpiryWatchStatuts() }, validUntil: { not: null } },
      select: { id: true, validUntil: true },
    }),
    listInactiveClientsForRelance(8),
    prisma.financeCharge.findMany({
      where: { dateCharge: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } },
      select: { amount: true, dateCharge: true },
    }).catch(() => { partialReasons.push('chargesHistory'); return []; }),
    prisma.paiement.findMany({
      where: { datePaiement: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } },
      select: { montant: true, type: true, datePaiement: true },
    }),
    getOpsRealtimeExtended().catch(() => {
      partialReasons.push('opsExtended');
      return null;
    }),
    prisma.cmCampaign.count({ where: { statut: { notIn: ['Terminée', 'Archivée', 'Annulée'] } } }).catch(() => {
      partialReasons.push('cm');
      return null as number | null;
    }),
  ]);

  const devisCountByStatut = Object.fromEntries(devisGroup.map((g) => [g.statut, g._count._all]));

  const caDay = computePaidTotal(paiementsToday);
  const caWeek = computePaidTotal(paiementsWeek);
  const caMonth = computePaidTotal(paiementsPeriode);
  const caYear = computePaidTotal(paiementsYear);

  const caChart = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const dayPayments = paiementsWeek.filter((p) => p.datePaiement >= d && p.datePaiement < next);
    return {
      label: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
      value: computePaidTotal(dayPayments),
    };
  });

  const devisEnAttente = pendingDevisStatuts().reduce((s, st) => s + (devisCountByStatut[st] ?? 0), 0);
  const devisAcceptes = devisCountByStatut[acceptedDevisStatut()] ?? 0;
  /** COM-007 v1 : dénominateur = tous hors brouillon (inclut refusés/expirés). */
  const devisConversionDenom = Object.entries(devisCountByStatut)
    .filter(([st]) => st !== brouillonDevisStatut())
    .reduce((s, [, n]) => s + n, 0);
  const tauxConversion =
    devisConversionDenom > 0 ? Math.round((devisAcceptes / devisConversionDenom) * 100) : 0;

  const cmdActives = cmdActivesCount;
  const cmdRetard = cmdRetardCount;
  const cmdUrgentes = cmdUrgentesCount;

  const facturesImpayees = factures
    .filter((f) => isUnpaidFactureStatut(f.statut))
    .reduce((s, f) => {
      const paid = computePaidTotal(f.paiements);
      return s + Math.max(0, f.totalTTC - paid);
    }, 0);

  const facturesEnRetard = factures.filter(
    (f) => isUnpaidFactureStatut(f.statut) && f.dateEcheance && f.dateEcheance < now,
  ).length;

  const montantFacturesEchues = factures
    .filter((f) => isUnpaidFactureStatut(f.statut) && f.dateEcheance && f.dateEcheance < now)
    .reduce((s, f) => s + Math.max(0, f.totalTTC - computePaidTotal(f.paiements)), 0);

  const impayesParClient = await getLiveImpayesParClient(8).catch(() => []);

  const livStatuts = Object.fromEntries(livraisonsGroup.map((l) => [livraisonStatutLabel(l.statut), l._count]));
  const livraisonsEnCours =
    (livStatuts['Préparation'] || 0) + (livStatuts['Prêt'] || 0) + (livStatuts['En livraison'] || 0);

  const clientIds = topClientsRaw.map((t) => t.clientId).filter(Boolean) as string[];
  const clientNames = clientIds.length
    ? await prisma.client.findMany({ where: { id: { in: clientIds } }, select: { id: true, name: true, code: true } })
    : [];
  const nameMap = Object.fromEntries(clientNames.map((c) => [c.id, c]));

  const topClients = topClientsRaw.map((t) => ({
    id: t.clientId,
    name: nameMap[t.clientId!]?.name || 'Client',
    code: nameMap[t.clientId!]?.code || '',
    ca: t._sum.montant || 0,
  }));

  const paiementsRecusJour = computePaidTotal(paiementsToday);
  const stockCritique = stockAlerts.length;

  const devisExpirantBientot = devisWithValidity.filter((d) => {
    const days = daysUntilDevisExpiry(d.validUntil);
    return days !== null && days >= 0 && days <= 15;
  }).length;

  const alertes = buildOperationalAlerts({
    cmdRetard,
    cmdUrgentes,
    facturesEnRetard,
    devisEnAttente,
    proofsPending: proofsPending ?? 0,
    stockCritique,
    absencesPending: rhStats.absencesPending,
    retardsToday: rhStats.retardsToday,
    tasksBlocked: taskStats.blocked,
    tasksTodayDue: taskStats.todayDue,
    reclamationsOuvertes: directorKpis.reclamationsOuvertes,
    machinesDown: directorKpis.machinesDown,
    gpaoBloques: gpaoStats.bloques,
    gpaoIncidents: gpaoStats.incidentsOuverts,
    tresorerieNegative: financeStats.tresorerieMois < 0,
    devisExpirantBientot,
    clientsInactifs: inactiveClients.length,
  });

  const caHighlight =
    period === 'day' ? caDay : period === 'month' ? caMonth : period === 'year' ? caYear : caWeek;

  const commandesByStatut = commandesGroup.map((c) => ({
    name: commandeStatutLabel(c.statut),
    value: c._count,
  }));
  const devisByStatut = devisGroup.map((g) => ({
    name: devisStatutLabel(g.statut),
    value: g._count._all,
  }));

  const livraisonsByStatut = livraisonsGroup.map((l) => ({
    name: livraisonStatutLabel(l.statut),
    value: l._count,
  }));

  const chargesByCategory = Object.entries(
    chargesMonth.reduce<Record<string, number>>((acc, c) => {
      const cat = c.category || 'Autre';
      acc[cat] = (acc[cat] ?? 0) + c.amount;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const topArticles: TopArticleData[] = buildTopOrderedArticles(commandesForCharts, {
    limit: 10,
    sortBy: 'quantity',
  });

  const machinesStatusResult = buildMachinesByStatus(machinesAll);
  const machinesStatus: MachineStatusData[] = machinesStatusResult.data;
  const totalMachines = machinesStatusResult.totalMachines;

  /** Compat slices/API historiques — dérivé de machinesStatus (pas de calcul séparé). */
  const machinesChart = machinesStatus.map((m) => ({ name: m.label, value: m.count }));

  const chartsUpdatedAt = new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const chartsPeriodLabel = buildPeriodLabel(period, dateRange);

  /** CA période − charges saisies (PAS un bénéfice net comptable — DIR-007 BLOCKED). */
  const caMoinsChargesMois = caMonth - financeStats.chargesMois;
  /** Marge approximative charges seules — couverture coûts incomplète (DIR-006 BLOCKED). */
  const margeApproximativeChargesPct =
    caMonth > 0 ? Math.round(((caMonth - financeStats.chargesMois) / caMonth) * 100) : 0;

  const caCommandesMonth = commandesPeriodeActives.reduce((s, c) => s + c.total, 0);
  const caByCommercial: CaByCommercialRow[] = buildCaByCommercial(commandesPeriodeActives);
  const clientsByVille = buildClientsByVille(clientsForGeo);
  const caByVille = buildCaByVille(commandesGeo);
  const caByCanal = buildCaByCanal(commandesGeo);
  const caByCanalDecouverte = buildCaByCanalDecouverte(commandesGeo);

  const coutsRevient = await getCoutsRevient(50, dateRange).catch(() => [] as Awaited<ReturnType<typeof getCoutsRevient>>);
  const margeReelle = coutsRevient.reduce((s, r) => s + r.marge, 0);
  const caCoutsBase = coutsRevient.reduce((s, r) => s + r.ca, 0);
  const margeReellePct = caCoutsBase > 0 ? Math.round((margeReelle / caCoutsBase) * 100) : 0;

  const [firstUnpaidFacture, firstPendingBat, firstDownMachine, firstLivraisonActive] = await Promise.all([
    prisma.facture.findFirst({
      where: { statut: { in: unpaidFactureStatuts() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    }),
    prisma.proof.findFirst({
      where: { statut: { in: ['En attente', 'Envoyé'] } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    }).catch(() => null),
    prisma.machine.findFirst({ where: { status: 'down' }, select: { id: true } }).catch(() => null),
    prisma.livraison.findFirst({
      where: { statut: { in: activeLivraisonPipelineStatuts() } },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    }),
  ]);

  const kpiDrawerHints = {
    commande: recentCmds[0]?.id,
    facture: firstUnpaidFacture?.id,
    bat: firstPendingBat?.id,
    stock: stockAlerts[0]?.id,
    machine: firstDownMachine?.id,
    livraison: firstLivraisonActive?.id,
  };

  const caVsDepenses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const label = d.toLocaleDateString('fr-FR', { month: 'short' });
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthPayments = paiementsHalfYear.filter((p) => {
      const pd = new Date(p.datePaiement);
      return pd >= d && pd <= monthEnd;
    });
    const monthCharges = chargesHalfYear.filter((c) => {
      const cd = new Date(c.dateCharge);
      return cd >= d && cd <= monthEnd;
    });
    return {
      name: label,
      ca: computePaidTotal(monthPayments),
      depenses: monthCharges.reduce((s, c) => s + (c.amount ?? 0), 0),
      depensesEstimees: false,
    };
  });
  const chartsHasEstimatedData = false;
  const caForecast = computeCaForecast(caVsDepenses);
  const caForecastSummary = forecastSummary(caForecast);

  return {
    period,
    computedAt: now.toISOString(),
    kpis: {
      caDay,
      caWeek,
      caMonth,
      caYear,
      caHighlight,
      devisEnAttente,
      devisAcceptes,
      tauxConversion,
      cmdActives,
      enProduction: productions,
      clients,
      cmdRetard,
      facturesImpayees,
      facturesEnRetard,
      montantFacturesEchues,
      livraisonsEnCours,
      paiementsRecusJour,
      cmdUrgentes,
      stockCritique,
      batEnAttente: proofsPending ?? 0,
      batEnAttenteStatus: proofsPending == null ? 'PARTIAL' : 'FRESH',
      reclamationsOuvertes: directorKpis.reclamationsOuvertes,
      machinesDown: directorKpis.machinesDown,
      machinesMaintSoon: directorKpis.machinesMaintSoon,
      cmdAPlanifier: directorKpis.cmdAPlanifier,
      tachesOuvertes: taskStats.totalOpen,
      tachesBloquees: taskStats.blocked,
      tachesAujourdhui: taskStats.todayDue,
      rhActifs: rhStats.totalActifs,
      rhPresents: rhStats.presentsToday,
      rhAbsencesPending: rhStats.absencesPending,
      rhRetards: rhStats.retardsToday,
      tresorerieMois: financeStats.tresorerieMois,
      impayesClients: financeStats.impayes,
      chargesMois: financeStats.chargesMois,
      dossiersGpao: gpaoStats.total,
      dossiersBloques: gpaoStats.bloques,
      incidentsGpao: gpaoStats.incidentsOuverts,
      caMoinsChargesMois,
      margeApproximativeChargesPct,
      /** @deprecated alias trompeur — utiliser caMoinsChargesMois */
      beneficeNet: caMoinsChargesMois,
      /** @deprecated alias — utiliser margeApproximativeChargesPct */
      margeGlobale: margeApproximativeChargesPct,
      caCommandesMonth,
      margeReelle,
      margeReellePct,
      /** Estimation magique incidents*50000 SUPPRIMÉE (P0-08). */
      coutErreurs: 0,
      coutErreursStatus: 'NOT_APPLICABLE',
      conversionFormulaId: 'COM-007',
      conversionNumerator: devisAcceptes,
      conversionDenominator: devisConversionDenom,
      caProgressPct: opsExtended?.caProgressPct ?? 0,
      plannedWorkloadHours: opsExtended?.plannedWorkloadHours ?? 0,
      cmCampagnesActives: cmCampagnesActives ?? 0,
      cmCampagnesStatus: cmCampagnesActives == null ? 'PARTIAL' : 'FRESH',
    },
    kpiMeta: {
      quality: partialReasons.length > 0 ? 'PARTIAL' : 'FRESH',
      warnings: [
        'DIR-006/007 BLOCKED — pas de bénéfice net comptable',
        'coutErreurs estimate removed',
        'unpaid facture list take:500 = sample for drawer only',
        'chart commande samples take:200/250 — coverage partielle',
        ...partialReasons.map((r) => `partial:${r}`),
      ],
      watermark: getKpiSourceWatermark(),
      timezone: DEFAULT_BUSINESS_TIMEZONE,
      timezoneNote: 'bornes jour/semaine/mois/année via BusinessClock Indian/Antananarivo',
      sampleCoverage: {
        commandesPeriodeActivesTake: 200,
        unpaidFacturesTake: 500,
        chartCommandesTake: 250,
      },
    },
    caChart,
    topClients,
    topArticles,
    machinesStatus,
    totalMachines,
    chartsUpdatedAt,
    chartsPeriodLabel,
    commandesByStatut,
    devisByStatut,
    livraisonsByStatut,
    machinesChart,
    chargesByCategory,
    caVsDepenses,
    caForecast,
    caForecastSummary,
    chartsHasEstimatedData,
    caByCommercial,
    clientsByVille,
    caByVille,
    caByCanal,
    caByCanalDecouverte,
    inactiveClients,
    impayesParClient,
    alertes,
    recentCmds: recentCmds.map((c) => ({
      id: c.id,
      numero: c.numero,
      client: c.client?.name || 'N/A',
      article: c.article,
      statut: c.statut,
      avancement: c.avancement,
      priorite: c.priorite,
    })),
    recentPaiements: recentPaiements.map((p) => ({
      id: p.id,
      commandeId: p.commandeId ?? p.facture?.commandeId ?? null,
      montant: p.montant,
      mode: p.mode,
      client: p.client?.name || '—',
      facture: p.facture?.numero,
      date: p.datePaiement,
    })),
    kpiDrawerHints,
    livraisonsPrevues: livraisonsPrevues.map((l) => ({
      id: l.id,
      numero: l.numero,
      client: l.client?.name || '—',
      commande: l.commande?.numero,
      statut: l.statut,
      datePrevue: l.datePrevue,
      livreur: l.livreur,
    })),
    recentAudit: recentAudit.map((a) => ({
      action: a.action,
      entity: a.entity,
      entityId: a.entityId,
      entityLabel: a.entityLabel,
      userName: a.userName,
      createdAt: a.createdAt,
    })),
    recentAnnonces: opsExtended?.recentAnnonces ?? [],
    devisEnAttenteList: opsExtended?.devisEnAttenteList ?? [],
    commandePeakHours: opsExtended?.commandePeakHours ?? [],
    topVillesClients: opsExtended?.topVillesClients ?? [],
    rhPointage: opsExtended?.rhPointage ?? { presentsToday: rhStats.presentNow, retardsToday: rhStats.retardsToday },
  };
}
