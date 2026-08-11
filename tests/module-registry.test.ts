import { describe, expect, it } from 'vitest';
import { MODULE_REGISTRY, resolveRoleProfile, getHomeRouteForRole, buildNavForRole } from '@/lib/modules';

describe('module registry', () => {
  it('lists core CRM modules with routes', () => {
    expect(MODULE_REGISTRY.clients.href).toBe('/clients');
    expect(MODULE_REGISTRY.devis.href).toBe('/devis');
    expect(MODULE_REGISTRY.production.href).toBe('/production');
  });

  it('maps commercial role to workspace home', () => {
    expect(getHomeRouteForRole('commercial')).toBe('/workspace/commercial');
    expect(resolveRoleProfile('commercial').label).toBe('Commercial');
  });

  it('maps production role to production workspace', () => {
    expect(getHomeRouteForRole('production')).toBe('/workspace/production');
  });

  it('maps finance role to finance workspace', () => {
    expect(getHomeRouteForRole('caisse')).toBe('/workspace/finance');
  });

  it('builds nav for admin with cockpit', () => {
    const nav = buildNavForRole('admin');
    const ids = nav.flatMap((g) => g.items.map((i) => i.id));
    expect(ids).toContain('cockpit');
    expect(ids).toContain('clients');
  });

  it('commercial nav excludes admin hub', () => {
    const nav = buildNavForRole('commercial');
    const ids = nav.flatMap((g) => g.items.map((i) => i.id));
    expect(ids).toContain('ws_commercial');
    expect(ids).not.toContain('admin_hub');
  });
});
