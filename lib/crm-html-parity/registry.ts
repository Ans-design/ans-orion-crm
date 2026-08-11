/**
 * Registre de parité CRM HTML v29 → Next.js ANS Orion
 * Source : crm complet ans design sauf devis deja fini par les developpeur ok.html
 */

export type ParityStatus = 'done' | 'partial' | 'missing' | 'excluded';

export type HtmlPageEntry = {
  htmlId: string;
  htmlLabel: string;
  nextRoute: string | null;
  moduleId: string | null;
  status: ParityStatus;
  notes?: string;
};

/** Toutes les pages du router HTML (l.3882) + nav employé */
export const HTML_PAGE_REGISTRY: HtmlPageEntry[] = [
  { htmlId: 'cockpit', htmlLabel: 'Tableau de Bord', nextRoute: '/dashboard', moduleId: 'cockpit', status: 'done' },
  { htmlId: 'ops', htmlLabel: 'Opérations Production', nextRoute: '/operations', moduleId: 'operations', status: 'done' },
  { htmlId: 'devis', htmlLabel: 'Devis & Proformas', nextRoute: '/devis', moduleId: 'devis', status: 'excluded', notes: 'Déjà finalisé par les développeurs' },
  { htmlId: 'commandes', htmlLabel: 'Commandes', nextRoute: '/commandes', moduleId: 'commandes', status: 'done' },
  { htmlId: 'clients', htmlLabel: 'CRM Clients', nextRoute: '/clients', moduleId: 'clients', status: 'done' },
  { htmlId: 'ventes', htmlLabel: 'Ventes Directes', nextRoute: '/finance/ventes-directes', moduleId: 'finance_ventes_directes', status: 'done' },
  { htmlId: 'finances', htmlLabel: 'Finances & Trésorerie', nextRoute: '/workspace/finance', moduleId: 'ws_finance', status: 'done' },
  { htmlId: 'facturation', htmlLabel: 'Facturation', nextRoute: '/factures', moduleId: 'factures', status: 'done' },
  { htmlId: 'achats', htmlLabel: 'Achats Fournisseurs', nextRoute: '/achats', moduleId: 'achats', status: 'done' },
  { htmlId: 'charges', htmlLabel: 'Charges & Dépenses', nextRoute: '/finance/charges', moduleId: 'finance_charges', status: 'done' },
  { htmlId: 'couts_revient', htmlLabel: 'Coûts de Revient', nextRoute: '/finance/couts-revient', moduleId: 'finance_couts', status: 'done' },
  { htmlId: 'plan_matiere', htmlLabel: 'Déchets & Pertes', nextRoute: '/production/dechets', moduleId: 'plan_matiere', status: 'done' },
  { htmlId: 'rapports', htmlLabel: 'Rapports & Analytics', nextRoute: '/rapports', moduleId: 'rapports', status: 'done' },
  { htmlId: 'adm_stocks', htmlLabel: 'Gestion Stocks', nextRoute: '/stock', moduleId: 'stock', status: 'done' },
  { htmlId: 'machines', htmlLabel: 'Machines & Équipements', nextRoute: '/machines', moduleId: 'machines', status: 'done' },
  { htmlId: 'adm_vue', htmlLabel: "Vue d'ensemble", nextRoute: '/admin/vue', moduleId: 'admin_overview', status: 'done' },
  { htmlId: 'adm_tasks', htmlLabel: 'Planning Gantt', nextRoute: '/planning', moduleId: 'planning', status: 'done', notes: 'Gantt visuel 7h–18h + liste' },
  { htmlId: 'adm_pay', htmlLabel: 'Paie & Salaires', nextRoute: '/rh/paie', moduleId: 'rh_paie', status: 'done', notes: 'Grille MGA + bulletin preview' },
  { htmlId: 'adm_rh', htmlLabel: 'RH & Recrutement', nextRoute: '/rh/recrutement', moduleId: 'rh_recruitment', status: 'done', notes: 'Pipeline ATS + employés sur /rh/employes' },
  { htmlId: 'adm_perf', htmlLabel: 'Performance Équipe', nextRoute: '/rh/performance', moduleId: 'rh_performance', status: 'done' },
  { htmlId: 'autres', htmlLabel: 'Présences & Congés', nextRoute: '/rh/absences', moduleId: 'rh_absences', status: 'done' },
  { htmlId: 'adm_messages', htmlLabel: 'ANS Talk', nextRoute: '/messagerie', moduleId: 'equipe_messages', status: 'done' },
  { htmlId: 'adm_suggest', htmlLabel: 'Suggestions', nextRoute: '/equipe/suggestions', moduleId: 'equipe_suggestions', status: 'done' },
  { htmlId: 'dir_ticker', htmlLabel: 'Alertes & Bandeau Info', nextRoute: '/admin/ticker', moduleId: 'admin_ticker', status: 'done' },
  { htmlId: 'dir_annexes', htmlLabel: 'Gestion des Annexes', nextRoute: '/admin/annexes', moduleId: 'admin_annexes', status: 'done' },
  { htmlId: 'notif_clients', htmlLabel: 'Notifications Clients', nextRoute: '/cm/notifications', moduleId: 'cm_notifications', status: 'done' },
  { htmlId: 'ws_graphiste', htmlLabel: 'Mon Studio', nextRoute: '/workspace/studio', moduleId: 'ws_studio', status: 'done' },
  { htmlId: 'ws_commercial', htmlLabel: 'Mon Espace Vente', nextRoute: '/workspace/commercial', moduleId: 'ws_commercial', status: 'done' },
  { htmlId: 'ws_operateur', htmlLabel: 'Mon Poste', nextRoute: '/workspace/production', moduleId: 'ws_production', status: 'done' },
  { htmlId: 'ws_logistique', htmlLabel: 'Mes Livraisons', nextRoute: '/workspace/logistique', moduleId: 'ws_logistique', status: 'done' },
  { htmlId: 'ws_taches', htmlLabel: 'Mes Tâches', nextRoute: '/equipe/taches', moduleId: 'equipe_taches', status: 'done' },
  { htmlId: 'ws_faconnage', htmlLabel: 'Mon Poste Façonnage', nextRoute: '/workspace/faconnage', moduleId: 'ws_faconnage', status: 'done' },
  { htmlId: 'ws_cm', htmlLabel: 'Mon Espace CM', nextRoute: '/workspace/cm', moduleId: 'ws_cm', status: 'done' },
  { htmlId: 'ws_tech', htmlLabel: 'Mon Espace Maintenance', nextRoute: '/workspace/maintenance', moduleId: 'ws_maintenance', status: 'done' },
  { htmlId: 'ws_matos', htmlLabel: 'Mes Équipements', nextRoute: '/rh/equipements', moduleId: 'rh_equipements', status: 'done' },
  { htmlId: 'materiels', htmlLabel: 'Matériels & Équipements', nextRoute: '/materiels', moduleId: 'materiels', status: 'done' },
  { htmlId: 'maint_tickets', htmlLabel: 'Tickets maintenance', nextRoute: '/maintenance/tickets', moduleId: 'maintenance_tickets', status: 'done' },
  { htmlId: 'cmd_360', htmlLabel: 'Fiche commande 360°', nextRoute: '/commandes', moduleId: 'commandes', status: 'done', notes: 'Fiche détail /commandes/[id] — 6 onglets (synthèse, production, BAT, logistique, finance, timeline)' },
  { htmlId: 'prepresse', htmlLabel: 'Vérification fichiers', nextRoute: '/studio?tab=prepresse', moduleId: 'prepresse', status: 'done' },
  { htmlId: 'qualite', htmlLabel: 'Contrôle qualité', nextRoute: '/production/qualite', moduleId: 'qualite', status: 'done' },
  { htmlId: 'ws_accueil', htmlLabel: 'Mon Accueil', nextRoute: '/workspace/accueil', moduleId: 'ws_accueil', status: 'done' },
  { htmlId: 'ws_conducteur', htmlLabel: 'Mon Poste Conducteur', nextRoute: '/workspace/conducteur', moduleId: 'ws_conducteur', status: 'done' },
  { htmlId: 'ws_magasin', htmlLabel: 'Mon Magasin', nextRoute: '/workspace/magasin', moduleId: 'ws_magasin', status: 'done' },
  { htmlId: 'reclamations', htmlLabel: 'Réclamations clients', nextRoute: '/reclamations', moduleId: 'reclamations', status: 'done' },
  { htmlId: 'emp_360', htmlLabel: 'Fiche employé 360°', nextRoute: '/rh/employes', moduleId: 'rh_employes', status: 'done', notes: 'Fiche détail /rh/employes/[id] — infos, présences, absences' },
  { htmlId: 'ws_bl', htmlLabel: 'Bons de Livraison', nextRoute: '/livraisons', moduleId: 'livraisons', status: 'done' },
  { htmlId: 'emp_profil', htmlLabel: 'Mon Profil', nextRoute: '/rh/mon-profil', moduleId: 'rh_mon_profil', status: 'done' },
  { htmlId: 'emp_dash', htmlLabel: 'Mon Tableau de Bord', nextRoute: '/rh/mon-profil', moduleId: 'rh_mon_profil', status: 'done', notes: 'Onglet dashboard dans mon profil' },
  { htmlId: 'emp_prod', htmlLabel: 'Mon Planning', nextRoute: '/equipe/taches', moduleId: 'equipe_taches', status: 'done' },
  { htmlId: 'emp_plan', htmlLabel: 'Congés & Absences', nextRoute: '/rh/absences', moduleId: 'rh_absences', status: 'done' },
  { htmlId: 'emp_messages', htmlLabel: 'ANS Talk', nextRoute: '/messagerie', moduleId: 'equipe_messages', status: 'done' },
  { htmlId: 'emp_suggest', htmlLabel: 'Suggestions', nextRoute: '/equipe/suggestions', moduleId: 'equipe_suggestions', status: 'done' },
];

/** Profils NAVS HTML → profils role-registry Next.js */
export const HTML_PROFILE_MAP: Record<string, string> = {
  director: 'director',
  admin: 'director',
  graphiste: 'graphiste',
  commercial: 'commercial',
  operateur: 'operateur',
  logistique: 'logistique',
  faconnage: 'faconnage',
  cm_social: 'cm_social',
  technicien: 'technicien',
  employee: 'lecture',
};

export function getHtmlPage(htmlId: string): HtmlPageEntry | undefined {
  return HTML_PAGE_REGISTRY.find((p) => p.htmlId === htmlId);
}

export function getParitySummary() {
  const counts = { done: 0, partial: 0, missing: 0, excluded: 0 };
  for (const p of HTML_PAGE_REGISTRY) counts[p.status]++;
  return { total: HTML_PAGE_REGISTRY.length, ...counts };
}

export function assertParityCoverage(): { ok: boolean; gaps: HtmlPageEntry[] } {
  const gaps = HTML_PAGE_REGISTRY.filter((p) => p.status === 'missing');
  return { ok: gaps.length === 0, gaps };
}
