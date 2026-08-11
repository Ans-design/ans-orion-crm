import { DATA_MASTER } from './data-master';

export type DashboardEntry = {
  id: string;
  label: string;
  route: string;
  roleTarget: string[];
  dataSources: string[];
  description: string;
};

/** Dashboards officiels — un landing par profil métier, même sources centrales */
export const DASHBOARD_REGISTRY: Record<string, DashboardEntry> = {
  cockpit_global: {
    id: 'cockpit_global',
    label: 'Cockpit global',
    route: '/dashboard',
    roleTarget: ['admin', 'manager', 'demo'],
    dataSources: Object.values(DATA_MASTER),
    description: 'Tableau de bord maître direction — synthèse 360°',
  },
  operations_temps_reel: {
    id: 'operations_temps_reel',
    label: 'Opérations temps réel',
    route: '/operations',
    roleTarget: ['admin', 'manager', 'production', 'livraison', 'designer'],
    dataSources: [DATA_MASTER.COMMANDES, DATA_MASTER.PRODUCTION, DATA_MASTER.STOCK, DATA_MASTER.MACHINES, DATA_MASTER.LIVRAISONS, DATA_MASTER.BAT],
    description: 'Exécution immédiate — urgences et blocages',
  },
  dashboard_vente: {
    id: 'dashboard_vente',
    label: 'Mon espace vente',
    route: '/workspace/commercial',
    roleTarget: ['commercial'],
    dataSources: [DATA_MASTER.CLIENTS, DATA_MASTER.DEVIS, DATA_MASTER.COMMANDES],
    description: 'CRM commercial — devis, clients, relances',
  },
  dashboard_graphiste: {
    id: 'dashboard_graphiste',
    label: 'Mon studio',
    route: '/workspace/studio',
    roleTarget: ['designer'],
    dataSources: [DATA_MASTER.BAT, DATA_MASTER.PRODUCTION, DATA_MASTER.COMMANDES],
    description: 'Briefs, fichiers, BAT, prépresse',
  },
  dashboard_production: {
    id: 'dashboard_production',
    label: 'Mon poste production',
    route: '/workspace/production',
    roleTarget: ['production'],
    dataSources: [DATA_MASTER.PRODUCTION, DATA_MASTER.COMMANDES, DATA_MASTER.MACHINES, DATA_MASTER.STOCK],
    description: 'GPAO — planning, kanban, machines',
  },
  dashboard_logistique: {
    id: 'dashboard_logistique',
    label: 'Mes livraisons',
    route: '/workspace/logistique',
    roleTarget: ['livraison'],
    dataSources: [DATA_MASTER.LIVRAISONS, DATA_MASTER.COMMANDES, DATA_MASTER.FINANCE],
    description: 'Tournées, BL, encaissements',
  },
  dashboard_finance: {
    id: 'dashboard_finance',
    label: 'Mon espace finance',
    route: '/workspace/finance',
    roleTarget: ['caisse'],
    dataSources: [DATA_MASTER.FINANCE, DATA_MASTER.CLIENTS],
    description: 'Factures, paiements, caisse, trésorerie',
  },
  dashboard_faconnage: {
    id: 'dashboard_faconnage',
    label: 'Mon poste façonnage',
    route: '/workspace/faconnage',
    roleTarget: ['faconnage'],
    dataSources: [DATA_MASTER.PRODUCTION, DATA_MASTER.COMMANDES, DATA_MASTER.STOCK],
    description: 'Façonnage — tâches, déchets, commandes',
  },
  dashboard_cm: {
    id: 'dashboard_cm',
    label: 'Mon espace CM',
    route: '/workspace/cm',
    roleTarget: ['cm'],
    dataSources: [DATA_MASTER.CLIENTS, DATA_MASTER.COMMANDES],
    description: 'Community Manager — réseaux & clients',
  },
  dashboard_maintenance: {
    id: 'dashboard_maintenance',
    label: 'Mon espace maintenance',
    route: '/workspace/maintenance',
    roleTarget: ['technicien'],
    dataSources: [DATA_MASTER.MACHINES, DATA_MASTER.STOCK],
    description: 'Technicien — interventions & machines',
  },
  dashboard_accueil: {
    id: 'dashboard_accueil',
    label: 'Mon accueil',
    route: '/workspace/accueil',
    roleTarget: ['accueil'],
    dataSources: [DATA_MASTER.CLIENTS, DATA_MASTER.COMMANDES, DATA_MASTER.LIVRAISONS],
    description: 'Agent d\'accueil — visiteurs, RDV, réception',
  },
  dashboard_conducteur: {
    id: 'dashboard_conducteur',
    label: 'Mon poste conducteur',
    route: '/workspace/conducteur',
    roleTarget: ['conducteur'],
    dataSources: [DATA_MASTER.MACHINES, DATA_MASTER.PRODUCTION, DATA_MASTER.COMMANDES],
    description: 'Conducteur machine — impression, rendement',
  },
  rapports_analyse: {
    id: 'rapports_analyse',
    label: 'Rapports & analyses',
    route: '/rapports',
    roleTarget: ['admin', 'manager'],
    dataSources: Object.values(DATA_MASTER),
    description: 'Analyse détaillée — pas de pilotage temps réel',
  },
};

const AUTH_TO_DASHBOARD: Record<string, string> = {
  admin: 'cockpit_global',
  manager: 'cockpit_global',
  demo: 'cockpit_global',
  commercial: 'dashboard_vente',
  designer: 'dashboard_graphiste',
  production: 'dashboard_production',
  livraison: 'dashboard_logistique',
  caisse: 'dashboard_finance',
  faconnage: 'dashboard_faconnage',
  cm: 'dashboard_cm',
  technicien: 'dashboard_maintenance',
  accueil: 'dashboard_accueil',
  conducteur: 'dashboard_conducteur',
  lecture: 'cockpit_global',
  user: 'cockpit_global',
};

export function getDashboardForAuthRole(authRole: string): DashboardEntry {
  const id = AUTH_TO_DASHBOARD[authRole] ?? 'cockpit_global';
  return DASHBOARD_REGISTRY[id];
}

export function getHomeRouteForDashboard(authRole: string): string {
  return getDashboardForAuthRole(authRole).route;
}
