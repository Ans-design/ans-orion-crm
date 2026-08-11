import { describe, expect, it } from 'vitest';
import { MODULE_REGISTRY, buildNavForRole } from '@/lib/modules';
import { PERMISSION_MATRIX_COLUMNS, EDITABLE_ROLES } from '@/lib/constants/permission-flags';
import { getModulePermissions, canViewModule } from '@/lib/modules/permission-matrix';
import { ORION_ROADMAP } from '@/lib/modules/roadmap';

describe('Super-admin permissions module', () => {
  it('registers admin permissions module (masqué, route conservée)', () => {
    expect(MODULE_REGISTRY.admin_permissions.href).toBe('/admin/permissions');
    expect(MODULE_REGISTRY.admin_permissions.status).toBe('hidden');
  });

  it('permissions masqué hors nav admin', () => {
    const ids = buildNavForRole('admin').flatMap((g) => g.items.map((i) => i.id));
    expect(ids).not.toContain('admin_permissions');
  });

  it('defines matrix columns for UI', () => {
    expect(PERMISSION_MATRIX_COLUMNS.length).toBeGreaterThanOrEqual(8);
    expect(PERMISSION_MATRIX_COLUMNS[0].key).toBe('canView');
    expect(EDITABLE_ROLES).toContain('commercial');
    expect(EDITABLE_ROLES).not.toContain('admin');
  });

  it('merges role override into effective flags', () => {
    const flags = getModulePermissions('commercial', 'tarifs', { canView: false });
    expect(flags.canView).toBe(false);
    expect(canViewModule('commercial', 'tarifs', { canView: false })).toBe(false);
  });

  it('ops fail-closed : commercial ne voit pas rh_paie / rh_employes', () => {
    expect(canViewModule('commercial', 'rh_paie')).toBe(false);
    expect(canViewModule('commercial', 'rh_employes')).toBe(false);
    expect(canViewModule('commercial', 'clients')).toBe(true);
  });

  it('hides module from nav when canView override false', () => {
    const ids = buildNavForRole('commercial', { cm_campagnes: { canView: false } })
      .flatMap((g) => g.items.map((i) => i.id));
    expect(ids).not.toContain('cm_campagnes');
  });

  it('roadmap marks step 10 permissions_admin as done', () => {
    const step10 = ORION_ROADMAP.find((s) => s.id === 'permissions_admin');
    expect(step10?.status).toBe('done');
  });
});
