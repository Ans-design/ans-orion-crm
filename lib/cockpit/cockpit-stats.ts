import { prisma } from '@/lib/prisma';
import { getDashboardStats } from '@/lib/services/dashboard-stats';
import { getOrionSyncStats } from '@/lib/sync/orion-sync';
import { getStockAlerts } from '@/lib/services/stock-service';
import { getDirectorKpis } from '@/lib/services/ops-alerts';
import { getMetierTaskStats } from '@/lib/services/metier-task-service';
import { getRhStats } from '@/lib/services/rh-service';
import { getFinanceAdvStats } from '@/lib/services/finance-adv-service';
import { getGpaoStats } from '@/lib/services/gpao-dossier-service';
import { buildOperationalAlerts, filterAlertsForRole } from './build-alerts';
import { getOpsRealtimeExtended } from './ops-realtime-extended';
import { getDashboardForAuthRole } from './dashboard-registry';
import { isCommandeDone } from '@/lib/data/status-registry';
import {
  commandeRetardStatut,
  completedCommandeStatuts,
  completedLivraisonStatuts,
  isPendingDevisStatut,
  isUnpaidFactureStatut,
  livraisonStatutLabel,
  pendingDevisStatuts,
  prospectClientStatut,
  readyToShipLivraisonStatuts,
  unpaidFactureStatuts,
} from '@/lib/server/data/prisma-statut-bridge';
import { computePaidTotal } from '@/lib/finance/payment-totals';
import { resolveBusinessPeriod } from '@/lib/kpi/business-clock';

function startOfDay(d: Date) {
  return resolveBusinessPeriod({ preset: 'day', now: d }).from;
}

const DIRECTOR_ROLES = new Set(['admin', 'manager', 'demo']);

/** Stats cockpit légères par rôle — évite le sur-fetch du dashboard global */
export async function getRoleCockpitStats(
  authRole: string,
  period: 'day' | 'week' | 'month' = 'week',
  opts?: { userId?: string },
) {
  const dashboard = getDashboardForAuthRole(authRole);

  if (DIRECTOR_ROLES.has(authRole)) {
    const full = await getDashboardStats(period);
    return {
      dashboardId: dashboard.id,
      dashboardLabel: dashboard.label,
      role: authRole,
      period,
      kpis: full.kpis,
      alertes: full.alertes,
      lists: {
        recentCmds: full.recentCmds,
        livraisonsPrevues: full.livraisonsPrevues,
        recentPaiements: full.recentPaiements,
      },
      sync: null,
    };
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);

  const syncRoleMap: Record<string, string | undefined> = {
    commercial: 'commercial',
    designer: 'designer',
    production: 'production',
    livraison: 'livraison',
    faconnage: 'production',
    technicien: 'production',
    conducteur: 'production',
    cm: 'commercial',
    accueil: 'commercial',
    caisse: undefined,
  };

  const syncRole = syncRoleMap[authRole];
  const [sync, taskStats, rhStats, financeStats, gpaoStats, directorKpis, stockAlerts] = await Promise.all([
    getOrionSyncStats(syncRole).catch(() => null),
    getMetierTaskStats(syncRole ? { type: syncRole === 'livraison' ? 'logistique' : syncRole === 'designer' ? 'graphisme' : syncRole as 'commercial' | 'production' } : undefined).catch(() => ({ totalOpen: 0, blocked: 0, todayDue: 0, byType: {} })),
    authRole === 'caisse' ? getRhStats().catch(() => null) : Promise.resolve(null),
    authRole === 'caisse' ? getFinanceAdvStats().catch(() => null) : Promise.resolve(null),
    authRole === 'production' ? getGpaoStats().catch(() => null) : Promise.resolve(null),
    getDirectorKpis().catch(() => ({
      reclamationsOuvertes: 0,
      machinesDown: 0,
      machinesMaintSoon: 0,
      cmdAPlanifier: 0,
      batEnAttente: 0,
    })),
    authRole === 'production' || authRole === 'conducteur' ? getStockAlerts().catch(() => []) : Promise.resolve([]),
  ]);

  let kpis: Record<string, number> = {};
  let lists: { livraisonsPrevues?: unknown[] } = {};

  if (authRole === 'commercial' || authRole === 'cm') {
    const [clients, devis, commandes, paiementsWeek, proofsPending, cmCampagnes] = await Promise.all([
      prisma.client.count({ where: { archived: false } }),
      prisma.devis.findMany({ select: { statut: true } }),
      prisma.commande.findMany({ select: { statut: true, priorite: true, dateLiv: true } }),
      prisma.paiement.findMany({ where: { datePaiement: { gte: weekStart } }, select: { montant: true, type: true } }),
      prisma.proof.count({ where: { statut: { in: ['En attente', 'Envoyé'] } } }).catch(() => 0),
      prisma.cmCampaign.count({ where: { statut: { notIn: ['Terminée', 'Archivée', 'Annulée'] } } }).catch(() => 0),
    ]);
    kpis = {
      devisEnAttente: devis.filter((d) => isPendingDevisStatut(d.statut)).length,
      cmdActives: commandes.filter((c) => !isCommandeDone(c.statut)).length,
      clients,
      caWeek: computePaidTotal(paiementsWeek),
      tachesOuvertes: taskStats.totalOpen,
      batEnAttente: proofsPending,
      cmCampagnesActives: cmCampagnes,
    };
  } else if (authRole === 'designer') {
    const cmdCount = await prisma.commande.count({ where: { statut: { notIn: [...completedCommandeStatuts()] } } });
    kpis = {
      cmdActives: cmdCount,
      batEnAttente: sync?.studio?.batEnAttente ?? 0,
      tachesOuvertes: sync?.tasks?.open ?? taskStats.totalOpen,
    };
  } else if (authRole === 'production' || authRole === 'faconnage') {
    const [productions, commandes, proofsPending] = await Promise.all([
      prisma.production.count({ where: { statut: { notIn: ['Terminé', 'Terminée'] } } }),
      prisma.commande.findMany({ select: { statut: true, priorite: true, dateLiv: true } }),
      prisma.proof.count({ where: { statut: { in: ['En attente', 'Envoyé'] } } }).catch(() => null as number | null),
    ]);
    const open = commandes.filter((c) => !isCommandeDone(c.statut));
    const cmdRetard = open.filter(
      (c) =>
        c.statut === commandeRetardStatut() ||
        (c.dateLiv != null && c.dateLiv < now && !isCommandeDone(c.statut)),
    ).length;
    const cmdUrgentes = open.filter((c) => c.priorite === 'Urgente').length;
    kpis = {
      enProduction: productions,
      cmdActives: open.length,
      cmdRetard,
      cmdUrgentes,
      batEnAttente: proofsPending ?? 0,
      machinesDown: directorKpis.machinesDown,
      stockCritique: stockAlerts.length,
      tachesOuvertes: sync?.tasks?.open ?? taskStats.totalOpen,
      tachesBloquees: sync?.tasks?.blocked ?? taskStats.blocked,
      dossiersBloques: gpaoStats?.bloques ?? sync?.gpao?.bloques ?? 0,
      ...(proofsPending == null ? { _partialBat: 1 } : {}),
    };
  } else if (authRole === 'technicien') {
    const ticketsOuverts = await prisma.maintenanceTicket
      .count({ where: { statut: { in: ['Ouvert', 'En cours', 'Ouverte'] } } })
      .catch(() => null as number | null);
    const machinesDown = directorKpis.machinesDown;
    kpis = {
      ticketsOuverts: ticketsOuverts ?? 0,
      machinesDown,
      tachesOuvertes: sync?.tasks?.open ?? taskStats.totalOpen,
      stockCritique: (await getStockAlerts().catch(() => [])).length,
      ...(ticketsOuverts == null ? { _partialTickets: 1 } : {}),
    };
  } else if (authRole === 'magasin' || authRole === 'magasinier') {
    const alerts = await getStockAlerts().catch(() => []);
    const items = await prisma.stockItem.findMany({
      where: { actif: true, archived: false },
      select: { quantity: true, reservedQty: true, minQty: true },
    });
    const ruptureCount = items.filter((s) => s.quantity - (s.reservedQty ?? 0) <= 0).length;
    const sousSeuil = items.filter((s) => {
      const avail = s.quantity - (s.reservedQty ?? 0);
      return avail > 0 && avail < (s.minQty ?? 0);
    }).length;
    kpis = {
      stockReferences: items.length,
      stockCritique: alerts.length,
      ruptures: ruptureCount,
      sousSeuil,
      reservations: await prisma.stockReservation.count({ where: { status: 'active' } }).catch(() => 0),
      tachesOuvertes: taskStats.totalOpen,
    };
  } else if (authRole === 'livraison') {
    const [commandes, livraisonsGroup, paiementsToday, livraisonsPrevues] = await Promise.all([
      prisma.commande.count({ where: { statut: { notIn: [...completedCommandeStatuts()] } } }),
      prisma.livraison.groupBy({ by: ['statut'], _count: true }),
      prisma.paiement.findMany({ where: { datePaiement: { gte: todayStart } }, select: { montant: true, type: true } }),
      prisma.livraison.findMany({
        where: { statut: { notIn: completedLivraisonStatuts() }, datePrevue: { gte: todayStart } },
        orderBy: { datePrevue: 'asc' },
        take: 8,
        include: { client: { select: { name: true } }, commande: { select: { numero: true } } },
      }),
    ]);
    const livStatuts = Object.fromEntries(livraisonsGroup.map((l) => [livraisonStatutLabel(l.statut), l._count]));
    lists.livraisonsPrevues = livraisonsPrevues.map((l) => ({
      id: l.id,
      numero: l.numero,
      client: l.client?.name || '—',
      commande: l.commande?.numero,
      statut: l.statut,
      datePrevue: l.datePrevue,
      livreur: l.livreur,
    }));
    kpis = {
      livraisonsEnCours: (livStatuts['Préparation'] || 0) + (livStatuts['Prêt'] || 0) + (livStatuts['En livraison'] || 0),
      cmdActives: commandes,
      paiementsRecusJour: computePaidTotal(paiementsToday),
      tachesOuvertes: sync?.tasks?.open ?? taskStats.totalOpen,
      /** Nombre de factures impayées (COUNT) — ne pas formater en Ariary. */
      facturesImpayeesCount: await prisma.facture.count({ where: { statut: { in: unpaidFactureStatuts() } } }),
      /** Reste à encaisser (MGA). */
      resteAEncaisserMga: await (async () => {
        const factures = await prisma.facture.findMany({
          where: { statut: { in: unpaidFactureStatuts() } },
          select: { totalTTC: true, paiements: { select: { montant: true, type: true } } },
        });
        return factures.reduce((s, f) => s + Math.max(0, f.totalTTC - computePaidTotal(f.paiements)), 0);
      })(),
      /** @deprecated alias COUNT — UI doit migrer vers facturesImpayeesCount */
      facturesImpayees: await prisma.facture.count({ where: { statut: { in: unpaidFactureStatuts() } } }),
    };
  } else if (authRole === 'caisse') {
    const factures = await prisma.facture.findMany({
      select: { statut: true, totalTTC: true, dateEcheance: true, paiements: { select: { montant: true, type: true } } },
    });
    const nowDate = new Date();
    const facturesImpayees = factures
      .filter((f) => isUnpaidFactureStatut(f.statut))
      .reduce((s, f) => s + Math.max(0, f.totalTTC - computePaidTotal(f.paiements)), 0);
    const facturesEnRetard = factures.filter(
      (f) => isUnpaidFactureStatut(f.statut) && f.dateEcheance && f.dateEcheance < nowDate,
    ).length;
    const paiementsToday = await prisma.paiement.findMany({
      where: { datePaiement: { gte: todayStart } },
      select: { montant: true, type: true },
    });
    kpis = {
      facturesImpayees,
      facturesEnRetard,
      paiementsRecusJour: computePaidTotal(paiementsToday),
      tresorerieMois: financeStats?.tresorerieMois ?? sync?.finance?.tresorerieMois ?? 0,
      chargesMois: financeStats?.chargesMois ?? sync?.finance?.chargesMois ?? 0,
      impayes: financeStats?.impayes ?? 0,
    };
  } else if (authRole === 'accueil') {
    const [clients, prospects, commandes, livraisons] = await Promise.all([
      prisma.client.count({ where: { archived: false } }),
      prisma.client.count({ where: { archived: false, statut: prospectClientStatut() } }),
      prisma.commande.count({ where: { statut: { notIn: [...completedCommandeStatuts()] } } }),
      prisma.livraison.count({ where: { statut: { in: readyToShipLivraisonStatuts() } } }),
    ]);
    let messagesNonLus = 0;
    if (opts?.userId) {
      const { getUnreadTalkCount } = await import('@/lib/messaging/messaging-service');
      messagesNonLus = await getUnreadTalkCount(opts.userId).catch(() => 0);
    }
    kpis = {
      clients,
      prospects,
      cmdActives: commandes,
      livraisonsActives: livraisons,
      devisEnAttente: await prisma.devis.count({ where: { statut: { in: pendingDevisStatuts() } } }),
      messagesNonLus,
    };
  } else if (authRole === 'conducteur') {
    const [productions, commandes, proofsPending, ticketsOpen] = await Promise.all([
      prisma.production.count({ where: { statut: { notIn: ['Terminé', 'Terminée'] } } }),
      prisma.commande.findMany({ select: { statut: true, priorite: true, dateLiv: true } }),
      prisma.proof.count({ where: { statut: { in: ['En attente', 'Envoyé'] } } }).catch(() => 0),
      prisma.maintenanceTicket.count({ where: { statut: { in: ['Ouvert', 'En cours'] }, impactPlanning: true } }).catch(() => 0),
    ]);
    const cmdRetard = commandes.filter(
      (c) =>
        !isCommandeDone(c.statut) &&
        (c.statut === commandeRetardStatut() || (c.dateLiv != null && c.dateLiv < now)),
    ).length;
    const cmdUrgentes = commandes.filter((c) => !isCommandeDone(c.statut) && c.priorite === 'Urgente').length;
    kpis = {
      enProduction: productions,
      cmdActives: commandes.filter((c) => !isCommandeDone(c.statut)).length,
      cmdRetard,
      cmdUrgentes,
      batEnAttente: proofsPending,
      machinesDown: directorKpis.machinesDown,
      ticketsPlanning: ticketsOpen,
      ticketsOuverts: ticketsOpen,
      tachesOuvertes: sync?.tasks?.open ?? taskStats.totalOpen,
      stockCritique: stockAlerts.length,
    };
  }

  const alertInputs = {
    cmdRetard: kpis.cmdRetard ?? 0,
    cmdUrgentes: kpis.cmdUrgentes ?? 0,
    facturesEnRetard: kpis.facturesEnRetard ?? 0,
    devisEnAttente: kpis.devisEnAttente ?? 0,
    proofsPending: kpis.batEnAttente ?? sync?.studio?.batEnAttente ?? 0,
    stockCritique: kpis.stockCritique ?? 0,
    absencesPending: rhStats?.absencesPending ?? sync?.rh?.absencesPending ?? 0,
    retardsToday: rhStats?.retardsToday ?? sync?.rh?.retardsToday ?? 0,
    tasksBlocked: sync?.tasks?.blocked ?? taskStats.blocked,
    tasksTodayDue: sync?.tasks?.dueToday ?? taskStats.todayDue,
    reclamationsOuvertes: directorKpis.reclamationsOuvertes,
    machinesDown: kpis.machinesDown ?? directorKpis.machinesDown,
    gpaoBloques: kpis.dossiersBloques ?? sync?.gpao?.bloques ?? 0,
    gpaoIncidents: sync?.gpao?.incidentsOuverts ?? 0,
    tresorerieNegative: (financeStats?.tresorerieMois ?? sync?.finance?.tresorerieMois ?? 0) < 0,
  };

  const alertes = filterAlertsForRole(authRole, buildOperationalAlerts(alertInputs));

  return {
    dashboardId: dashboard.id,
    dashboardLabel: dashboard.label,
    role: authRole,
    period,
    kpis,
    alertes,
    lists,
    sync,
  };
}

/** Hub opérations — actions immédiates + métriques temps réel */
export async function getOperationsStats() {
  const now = new Date();
  const todayStart = startOfDay(now);

  const [
    taskStats,
    directorKpis,
    gpaoStats,
    stockAlerts,
    proofsPending,
    extended,
    rhStats,
    financeStats,
    facturesEnRetard,
    devisEnAttente,
  ] = await Promise.all([
    getMetierTaskStats().catch(() => ({ totalOpen: 0, blocked: 0, todayDue: 0, byType: {} })),
    getDirectorKpis().catch(() => ({
      reclamationsOuvertes: 0,
      machinesDown: 0,
      machinesMaintSoon: 0,
      cmdAPlanifier: 0,
      batEnAttente: 0,
    })),
    getGpaoStats().catch(() => ({ total: 0, enCours: 0, bloques: 0, incidentsOuverts: 0, enRetard: 0 })),
    getStockAlerts().catch(() => []),
    prisma.proof.count({ where: { statut: { in: ['En attente', 'Envoyé'] } } }).catch(() => 0),
    getOpsRealtimeExtended().catch(() => null),
    getRhStats().catch(() => ({ totalActifs: 0, presentsToday: 0, retardsToday: 0, absencesPending: 0, announcements: 0, presentNow: 0 })),
    getFinanceAdvStats().catch(() => ({ entreesMois: 0, sortiesMois: 0, tresorerieMois: 0, ventesDirectesMois: 0, ventesDirectesCount: 0, chargesMois: 0, impayes: 0 })),
    prisma.facture.count({
      where: {
        statut: { in: unpaidFactureStatuts() },
        dateEcheance: { lt: now },
      },
    }).catch(() => 0),
    prisma.devis.count({ where: { statut: { in: pendingDevisStatuts() } } }).catch(() => 0),
  ]);

  const cmdUrgentes = await prisma.commande.count({
    where: { priorite: 'Urgente', statut: { notIn: [...completedCommandeStatuts()] } },
  });
  const cmdRetard = await prisma.commande.count({
    where: {
      OR: [
        { statut: commandeRetardStatut() },
        { dateLiv: { lt: now }, statut: { notIn: [...completedCommandeStatuts()] } },
      ],
    },
  });

  const alertes = buildOperationalAlerts({
    cmdRetard,
    cmdUrgentes,
    facturesEnRetard,
    devisEnAttente,
    proofsPending,
    stockCritique: stockAlerts.length,
    absencesPending: rhStats.absencesPending,
    retardsToday: rhStats.retardsToday,
    tasksBlocked: taskStats.blocked,
    tasksTodayDue: taskStats.todayDue,
    reclamationsOuvertes: directorKpis.reclamationsOuvertes,
    machinesDown: directorKpis.machinesDown,
    gpaoBloques: gpaoStats.bloques,
    gpaoIncidents: gpaoStats.incidentsOuverts,
    tresorerieNegative: financeStats.tresorerieMois < 0,
  });

  return {
    urgentCount: alertes.length,
    alertes,
    kpis: {
      cmdUrgentes,
      cmdRetard,
      tachesBloquees: taskStats.blocked,
      tachesAujourdhui: taskStats.todayDue,
      machinesDown: directorKpis.machinesDown,
      stockCritique: stockAlerts.length,
      batEnAttente: proofsPending,
      dossiersBloques: gpaoStats.bloques,
      incidentsGpao: gpaoStats.incidentsOuverts,
      plannedWorkloadHours: extended?.plannedWorkloadHours ?? 0,
      caProgressPct: extended?.caProgressPct ?? 0,
    },
    realtime: extended ?? {
      commandePeakHours: [],
      plannedWorkloadHours: 0,
      commandesEnCours: [],
      topVillesClients: [],
      caProgressPct: 0,
      caMonth: 0,
      recentAnnonces: [],
      devisEnAttenteList: [],
      commandesSansDevis: [],
      paiementsByMode: [],
      rhPointage: { presentsToday: 0, retardsToday: 0 },
    },
  };
}

export { getDashboardForAuthRole, getHomeRouteForDashboard } from './dashboard-registry';
