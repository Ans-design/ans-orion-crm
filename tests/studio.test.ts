import { describe, expect, it } from 'vitest';
import { MODULE_REGISTRY, buildNavForRole } from '@/lib/modules';
import { BRIEF_STATUTS, PREPRESS_CHECKLIST, VERSION_LABELS } from '@/lib/constants/studio';
import { ORION_ROADMAP } from '@/lib/modules/roadmap';

describe('Studio graphique module', () => {
  it('registers studio hub as unique nav entry (tabs = deep-links)', () => {
    expect(MODULE_REGISTRY.studio_hub.status).toBe('active');
    expect(MODULE_REGISTRY.studio_hub.href).toBe('/studio');
    expect(MODULE_REGISTRY.studio_briefs.status).toBe('hidden');
    expect(MODULE_REGISTRY.studio_briefs.href).toBe('/studio?tab=briefs');
    expect(MODULE_REGISTRY.studio_fichiers.status).toBe('hidden');
    expect(MODULE_REGISTRY.studio_fichiers.href).toBe('/studio?tab=fichiers');
    expect(MODULE_REGISTRY.prepresse.status).toBe('hidden');
  });

  it('graphiste nav includes studio hub (not tab duplicates)', () => {
    const ids = buildNavForRole('designer').flatMap((g) => g.items.map((i) => i.id));
    expect(ids).toContain('studio_hub');
    expect(ids).not.toContain('studio_briefs');
    expect(ids).not.toContain('studio_fichiers');
    expect(ids).not.toContain('prepresse');
  });

  it('defines studio constants', () => {
    expect(BRIEF_STATUTS).toContain('BAT envoyé');
    expect(VERSION_LABELS).toContain('V1');
    expect(PREPRESS_CHECKLIST).toHaveLength(8);
  });

  it('roadmap marks step 7 studio as done', () => {
    const step7 = ORION_ROADMAP.find((s) => s.id === 'studio_enriched');
    expect(step7?.status).toBe('done');
  });
});
