import { describe, expect, it } from 'vitest';
import { MODULE_REGISTRY, buildNavForRole } from '@/lib/modules';
import { SUGGESTION_STATUSES } from '@/lib/constants/team-communication';
import { ORION_ROADMAP, getRoadmapProgress } from '@/lib/modules/roadmap';

describe('communication équipe', () => {
  it('registers messages and suggestions modules', () => {
    expect(MODULE_REGISTRY.equipe_messages.href).toBe('/messagerie');
    expect(MODULE_REGISTRY.equipe_suggestions.href).toBe('/equipe/suggestions');
    expect(MODULE_REGISTRY.equipe_messages.status).toBe('active');
  });

  it('includes communication in commercial nav', () => {
    const ids = buildNavForRole('commercial').flatMap((g) => g.items.map((i) => i.id));
    expect(ids).toContain('equipe_messages');
    expect(ids).toContain('equipe_suggestions');
  });

  it('includes communication in production nav', () => {
    const ids = buildNavForRole('production').flatMap((g) => g.items.map((i) => i.id));
    expect(ids).toContain('equipe_messages');
  });

  it('defines suggestion statuses', () => {
    expect(SUGGESTION_STATUSES).toContain('En étude');
    expect(SUGGESTION_STATUSES).toContain('Prioritaire');
  });

  it('roadmap marks step 2 communication as done', () => {
    const step2 = ORION_ROADMAP.find((s) => s.id === 'communication');
    expect(step2?.status).toBe('done');
    expect(getRoadmapProgress().done).toBeGreaterThanOrEqual(2);
  });
});
