import { describe, expect, it } from 'vitest';
import { MODULE_REGISTRY, buildNavForRole } from '@/lib/modules';
import { DEFAULT_ANNEXES, SITE_FILTER_ALL } from '@/lib/constants/annex';
import { ORION_ROADMAP } from '@/lib/modules/roadmap';

describe('Multi-annexes module', () => {
  it('registers admin annexes module (masqué, route conservée)', () => {
    expect(MODULE_REGISTRY.admin_annexes.href).toBe('/admin/annexes');
    expect(MODULE_REGISTRY.admin_annexes.status).toBe('hidden');
  });

  it('annexes masqué hors nav admin', () => {
    const ids = buildNavForRole('admin').flatMap((g) => g.items.map((i) => i.id));
    expect(ids).not.toContain('admin_annexes');
  });

  it('defines default annexes AX0 AX1', () => {
    expect(DEFAULT_ANNEXES.map((a) => a.code)).toEqual(['AX0', 'AX1']);
    expect(DEFAULT_ANNEXES[0].isDefault).toBe(true);
    expect(SITE_FILTER_ALL).toBe('ALL');
  });

  it('roadmap marks step 9 multi_site as done', () => {
    const step9 = ORION_ROADMAP.find((s) => s.id === 'multi_site');
    expect(step9?.status).toBe('done');
  });
});
