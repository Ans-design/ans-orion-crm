import { describe, expect, it } from 'vitest';
import {
  HTML_PAGE_REGISTRY,
  HTML_PROFILE_MAP,
  assertParityCoverage,
  getParitySummary,
} from '@/lib/crm-html-parity/registry';
import { MODULE_REGISTRY } from '@/lib/modules';

describe('CRM HTML v29 parity registry', () => {
  it('covers all HTML router pages', () => {
    const htmlIds = [
      'cockpit', 'ops', 'devis', 'commandes', 'clients', 'ventes', 'finances', 'facturation',
      'achats', 'charges', 'couts_revient', 'plan_matiere', 'rapports', 'adm_stocks', 'machines',
      'adm_vue', 'adm_tasks', 'adm_pay', 'adm_rh', 'adm_perf', 'autres', 'adm_messages', 'adm_suggest',
      'dir_ticker', 'dir_annexes', 'notif_clients', 'ws_graphiste', 'ws_commercial', 'ws_operateur',
      'ws_logistique', 'ws_taches', 'ws_faconnage', 'ws_cm', 'ws_tech', 'ws_matos', 'ws_bl',
      'emp_profil', 'emp_dash', 'emp_prod', 'emp_plan', 'emp_messages', 'emp_suggest',
    ];
    for (const id of htmlIds) {
      expect(HTML_PAGE_REGISTRY.some((p) => p.htmlId === id)).toBe(true);
    }
  });

  it('has no missing pages (devis excluded)', () => {
    const { ok, gaps } = assertParityCoverage();
    expect(ok).toBe(true);
    expect(gaps).toHaveLength(0);
  });

  it('maps done pages to existing module routes', () => {
    const done = HTML_PAGE_REGISTRY.filter((p) => p.status === 'done' && p.moduleId);
    for (const page of done) {
      const mod = MODULE_REGISTRY[page.moduleId!];
      expect(mod, `module ${page.moduleId} for ${page.htmlId}`).toBeDefined();
      expect(mod.href).toBe(page.nextRoute);
    }
  });

  it('excludes devis only', () => {
    const excluded = HTML_PAGE_REGISTRY.filter((p) => p.status === 'excluded');
    expect(excluded).toHaveLength(1);
    expect(excluded[0].htmlId).toBe('devis');
  });

  it('maps HTML NAV profiles', () => {
    expect(HTML_PROFILE_MAP.faconnage).toBe('faconnage');
    expect(HTML_PROFILE_MAP.cm_social).toBe('cm_social');
    expect(HTML_PROFILE_MAP.technicien).toBe('technicien');
  });

  it('reports parity summary', () => {
    const s = getParitySummary();
    expect(s.total).toBeGreaterThan(40);
    expect(s.missing).toBe(0);
  });
});

describe('new CRM modules registered', () => {
  it('registers faconnage workspace', () => {
    expect(MODULE_REGISTRY.ws_faconnage.href).toBe('/workspace/faconnage');
  });

  it('registers CM workspace and notifications', () => {
    expect(MODULE_REGISTRY.ws_cm.href).toBe('/workspace/cm');
    expect(MODULE_REGISTRY.cm_notifications.href).toBe('/cm/notifications');
  });

  it('registers maintenance workspace and dechets page', () => {
    expect(MODULE_REGISTRY.ws_maintenance.href).toBe('/workspace/maintenance');
    expect(MODULE_REGISTRY.plan_matiere.href).toBe('/production/dechets');
  });

  it('registers admin ticker and rh performance', () => {
    expect(MODULE_REGISTRY.admin_ticker.href).toBe('/admin/ticker');
    expect(MODULE_REGISTRY.rh_performance.href).toBe('/rh/performance');
    expect(MODULE_REGISTRY.rh_mon_profil.href).toBe('/rh/mon-profil');
  });
});
