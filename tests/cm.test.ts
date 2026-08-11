import { describe, expect, it } from 'vitest';
import { MODULE_REGISTRY, buildNavForRole } from '@/lib/modules';
import { CAMPAIGN_STATUTS, RELANCE_STATUTS, TEMPLATE_CATEGORIES } from '@/lib/constants/cm';
import { ORION_ROADMAP } from '@/lib/modules/roadmap';

describe('CM / Marketing module', () => {
  it('registers cm modules', () => {
    expect(MODULE_REGISTRY.cm_campagnes.href).toBe('/cm/campagnes');
    expect(MODULE_REGISTRY.cm_relances.status).toBe('active');
    expect(MODULE_REGISTRY.cm_relances.href).toBe('/cm/relances');
  });

  it('director nav includes CM section', () => {
    const ids = buildNavForRole('admin').flatMap((g) => g.items.map((i) => i.id));
    expect(ids).toContain('cm_campagnes');
    expect(ids).toContain('cm_relances');
  });

  it('commercial nav includes relances', () => {
    const ids = buildNavForRole('commercial').flatMap((g) => g.items.map((i) => i.id));
    expect(ids).toContain('cm_relances');
  });

  it('defines CM constants', () => {
    expect(CAMPAIGN_STATUTS).toContain('Active');
    expect(RELANCE_STATUTS).toContain('Planifiée');
    expect(TEMPLATE_CATEGORIES).toContain('Relance devis');
  });

  it('roadmap marks step 8 cm as done', () => {
    const step8 = ORION_ROADMAP.find((s) => s.id === 'cm_marketing');
    expect(step8?.status).toBe('done');
  });
});
