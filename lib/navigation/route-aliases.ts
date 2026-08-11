/** Redirections navigation — anciennes routes / alias HTML v29 → routes Next.js */
export const ORION_ROUTE_ALIASES: Record<string, string> = {
  '/logs': '/historique',
  '/audit': '/historique',
  '/admin-prix': '/administration/articles',
  '/prix': '/administration/articles',
  '/hub-config': '/administration/vue-ensemble',
  '/hub-configuration': '/administration/vue-ensemble',
  '/backoffice': '/administration/backoffice',
  '/administration': '/administration/vue-ensemble',
  '/stock-matiere': '/stock',
  '/gpao': '/production',
  '/kanban': '/production',
  '/tarifs': '/administration/prix',
};

export const ORION_NAV_GROUP_LABELS: Record<string, string> = {
  prix_tarifs: 'Prix & Tarifs',
  historique_audit: 'Historique & Audit',
  administration: 'Administration',
  stock_appro: 'Stock & Approvisionnement',
  production: 'Production',
  crm: 'CRM & Clients',
  vente: 'Vente & POS',
};
