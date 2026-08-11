/** Compatibilité routes / labels historiques → modules officiels */
export const ROUTE_ALIASES: Record<string, string> = {
  '/dashboard': 'cockpit_global',
  '/admin-control': 'admin_backoffice',
  '/admin': 'admin_backoffice',
  '/rapports': 'rapports_analyse',
  '/workspace/commercial': 'dashboard_vente',
  '/workspace/studio': 'dashboard_graphiste',
  '/workspace/production': 'dashboard_production',
  '/workspace/logistique': 'dashboard_logistique',
  '/workspace/finance': 'dashboard_finance',
  '/operations': 'operations_temps_reel',
};

export const MODULE_ROUTE_ALIASES: Record<string, string> = {
  cockpit: 'cockpit_global',
  ws_commercial: 'dashboard_vente',
  ws_studio: 'dashboard_graphiste',
  ws_production: 'dashboard_production',
  ws_logistique: 'dashboard_logistique',
  ws_finance: 'dashboard_finance',
  rapports: 'rapports_analyse',
  admin_hub: 'admin_overview',
};

export function resolveModuleId(moduleId: string): string {
  return MODULE_ROUTE_ALIASES[moduleId] ?? moduleId;
}
