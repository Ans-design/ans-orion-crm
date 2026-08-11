import { describe, expect, it } from 'vitest';
import { DASHBOARD_REGISTRY, getDashboardForAuthRole, getHomeRouteForDashboard } from '@/lib/cockpit/dashboard-registry';
import { DATA_MASTER } from '@/lib/cockpit/data-master';
import { ROUTE_ALIASES } from '@/lib/cockpit/route-aliases';
import { buildOperationalAlerts } from '@/lib/cockpit/build-alerts';
import { MODULE_REGISTRY, buildNavForRole, getHomeRouteForRole } from '@/lib/modules';

describe('Cockpit architecture', () => {
  it('defines single global cockpit for direction', () => {
    expect(DASHBOARD_REGISTRY.cockpit_global.route).toBe('/dashboard');
    expect(DASHBOARD_REGISTRY.cockpit_global.label).toBe('Cockpit global');
    expect(getDashboardForAuthRole('admin').id).toBe('cockpit_global');
  });

  it('separates operations hub from global cockpit', () => {
    expect(DASHBOARD_REGISTRY.operations_temps_reel.route).toBe('/operations');
    expect(DASHBOARD_REGISTRY.operations_temps_reel.route).not.toBe(DASHBOARD_REGISTRY.cockpit_global.route);
  });

  it('maps roles to dedicated dashboards without duplicate routes', () => {
    expect(getHomeRouteForDashboard('commercial')).toBe('/workspace/commercial');
    expect(getHomeRouteForDashboard('caisse')).toBe('/workspace/finance');
    expect(getHomeRouteForRole('caisse')).toBe('/workspace/finance');
  });

  it('registers finance workspace module', () => {
    expect(MODULE_REGISTRY.ws_finance.href).toBe('/workspace/finance');
    expect(MODULE_REGISTRY.operations.href).toBe('/operations');
    expect(MODULE_REGISTRY.cockpit.label).toBe('Cockpit global');
  });

  it('director nav has pilotage group without duplicate CM links in commercial', () => {
    const adminIds = buildNavForRole('admin').flatMap((g) => g.items.map((i) => i.id));
    expect(adminIds).toContain('operations');
    expect(adminIds.indexOf('cockpit')).toBeLessThan(adminIds.indexOf('operations'));

    const commercialIds = buildNavForRole('commercial').flatMap((g) => g.items.map((i) => i.id));
    expect(commercialIds.filter((id) => id === 'cm_campagnes').length).toBe(1);
    expect(commercialIds.filter((id) => id === 'cm_relances').length).toBe(1);
  });

  it('declares data masters for anti-redundancy', () => {
    expect(DATA_MASTER.COMMANDES).toBe('COMMANDES_MASTER');
    expect(Object.keys(DATA_MASTER).length).toBeGreaterThanOrEqual(10);
  });

  it('maps legacy route aliases', () => {
    expect(ROUTE_ALIASES['/dashboard']).toBe('cockpit_global');
    expect(ROUTE_ALIASES['/operations']).toBe('operations_temps_reel');
  });

  it('builds operational alerts from shared helper', () => {
    const alerts = buildOperationalAlerts({
      cmdRetard: 2,
      cmdUrgentes: 1,
      facturesEnRetard: 0,
      devisEnAttente: 3,
      proofsPending: 0,
      stockCritique: 0,
      absencesPending: 0,
      retardsToday: 0,
      tasksBlocked: 1,
      tasksTodayDue: 0,
      reclamationsOuvertes: 0,
      machinesDown: 0,
      gpaoBloques: 0,
      gpaoIncidents: 0,
      tresorerieNegative: false,
    });
    expect(alerts.some((a) => a.type === 'urgent')).toBe(true);
    expect(alerts.some((a) => a.type === 'devis')).toBe(true);
  });
});
