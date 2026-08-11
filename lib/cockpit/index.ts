export { DATA_MASTER } from './data-master';
export { ROUTE_ALIASES, MODULE_ROUTE_ALIASES, resolveModuleId } from './route-aliases';
export { DASHBOARD_REGISTRY, getDashboardForAuthRole, getHomeRouteForDashboard } from './dashboard-registry';
export { buildOperationalAlerts, filterAlertsForRole } from './build-alerts';
export type { CockpitAlert } from './build-alerts';
export { getRoleCockpitStats, getOperationsStats } from './cockpit-stats';
