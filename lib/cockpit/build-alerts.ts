export type CockpitAlert = { type: string; label: string; href: string; priority?: number };

type AlertInputs = {
  cmdRetard: number;
  cmdUrgentes: number;
  facturesEnRetard: number;
  devisEnAttente: number;
  proofsPending: number;
  stockCritique: number;
  absencesPending: number;
  retardsToday: number;
  tasksBlocked: number;
  tasksTodayDue: number;
  reclamationsOuvertes: number;
  machinesDown: number;
  gpaoBloques: number;
  gpaoIncidents: number;
  tresorerieNegative: boolean;
  devisExpirantBientot?: number;
  clientsInactifs?: number;
};

export function buildOperationalAlerts(input: AlertInputs, filter?: string[]): CockpitAlert[] {
  const all: CockpitAlert[] = [
    ...(input.cmdUrgentes > 0 ? [{ type: 'urgent', label: `${input.cmdUrgentes} commande(s) urgentes`, href: '/commandes', priority: 1 }] : []),
    ...(input.cmdRetard > 0 ? [{ type: 'retard', label: `${input.cmdRetard} commande(s) en retard`, href: '/commandes', priority: 2 }] : []),
    ...(input.tasksBlocked > 0 ? [{ type: 'task', label: `${input.tasksBlocked} tâche(s) bloquée(s)`, href: '/equipe/taches?status=Bloquée', priority: 1 }] : []),
    ...(input.tasksTodayDue > 0 ? [{ type: 'task-due', label: `${input.tasksTodayDue} tâche(s) à faire aujourd'hui`, href: '/equipe/taches', priority: 3 }] : []),
    ...(input.machinesDown > 0 ? [{ type: 'machine', label: `${input.machinesDown} machine(s) hors service`, href: '/machines', priority: 1 }] : []),
    ...(input.stockCritique > 0 ? [{ type: 'stock', label: `${input.stockCritique} article(s) stock critique`, href: '/stock', priority: 2 }] : []),
    ...(input.proofsPending > 0 ? [{ type: 'bat', label: `${input.proofsPending} BAT en attente`, href: '/bat', priority: 2 }] : []),
    ...(input.gpaoBloques > 0 ? [{ type: 'gpao', label: `${input.gpaoBloques} dossier(s) GPAO bloqué(s)`, href: '/production/dossiers?statut=Bloqué', priority: 1 }] : []),
    ...(input.gpaoIncidents > 0 ? [{ type: 'incident', label: `${input.gpaoIncidents} incident(s) production`, href: '/production/dossiers', priority: 2 }] : []),
    ...(input.facturesEnRetard > 0 ? [{ type: 'facture', label: `${input.facturesEnRetard} facture(s) échue(s)`, href: '/factures?overdue=1', priority: 3 }] : []),
    ...(input.devisEnAttente > 0 ? [{ type: 'devis', label: `${input.devisEnAttente} devis en attente`, href: '/devis', priority: 4 }] : []),
    ...((input.devisExpirantBientot ?? 0) > 0 ? [{ type: 'devis-expire', label: `${input.devisExpirantBientot} devis expirent sous 15 j`, href: '/devis', priority: 2 }] : []),
    ...((input.clientsInactifs ?? 0) > 0 ? [{ type: 'client-inactif', label: `${input.clientsInactifs} client(s) inactifs 2 mois`, href: '/clients', priority: 4 }] : []),
    ...(input.reclamationsOuvertes > 0 ? [{ type: 'reclamation', label: `${input.reclamationsOuvertes} réclamation(s) ouverte(s)`, href: '/reclamations', priority: 3 }] : []),
    ...(input.absencesPending > 0 ? [{ type: 'rh', label: `${input.absencesPending} congé(s) en attente`, href: '/rh/absences', priority: 5 }] : []),
    ...(input.retardsToday > 0 ? [{ type: 'rh-retard', label: `${input.retardsToday} retard(s) aujourd'hui`, href: '/rh/employes', priority: 5 }] : []),
    ...(input.tresorerieNegative ? [{ type: 'finance', label: 'Trésorerie mensuelle négative', href: '/finance/charges', priority: 4 }] : []),
  ];

  if (!filter?.length) return all.sort((a, b) => (a.priority ?? 9) - (b.priority ?? 9));
  return all.filter((a) => filter.includes(a.type)).sort((a, b) => (a.priority ?? 9) - (b.priority ?? 9));
}

const ROLE_ALERT_TYPES: Record<string, string[]> = {
  commercial: ['devis', 'devis-expire', 'client-inactif', 'urgent', 'retard', 'reclamation', 'facture'],
  designer: ['bat', 'task', 'task-due', 'gpao'],
  production: ['urgent', 'retard', 'bat', 'machine', 'stock', 'gpao', 'incident', 'task', 'task-due'],
  livraison: ['urgent', 'retard', 'task', 'task-due', 'facture'],
  finance: ['facture', 'finance', 'devis', 'devis-expire', 'client-inactif'],
  director: [],
};

export function filterAlertsForRole(authRole: string, alerts: CockpitAlert[]): CockpitAlert[] {
  const types = ROLE_ALERT_TYPES[authRole];
  if (!types || types.length === 0) return alerts;
  return alerts.filter((a) => types.includes(a.type));
}
