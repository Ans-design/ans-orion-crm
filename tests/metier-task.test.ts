import { describe, expect, it } from 'vitest';
import { MODULE_REGISTRY, buildNavForRole } from '@/lib/modules';
import { TASK_TYPES, TASK_STATUSES, TASK_TYPE_ROLES } from '@/lib/constants/metier-task';
import { formatElapsed, getLiveElapsedSec } from '@/lib/services/metier-task-service';
import { ORION_ROADMAP } from '@/lib/modules/roadmap';

describe('metier tasks sync', () => {
  it('registers equipe_taches module', () => {
    expect(MODULE_REGISTRY.equipe_taches.href).toBe('/equipe/taches');
    expect(MODULE_REGISTRY.equipe_taches.status).toBe('active');
  });

  it('production nav includes tasks', () => {
    const ids = buildNavForRole('production').flatMap((g) => g.items.map((i) => i.id));
    expect(ids).toContain('equipe_taches');
  });

  it('maps task types to auth roles', () => {
    expect(TASK_TYPE_ROLES.graphisme).toBe('designer');
    expect(TASK_TYPE_ROLES.logistique).toBe('livraison');
  });

  it('defines task statuses and types', () => {
    expect(TASK_STATUSES).toContain('En cours');
    expect(TASK_TYPES).toContain('production');
  });

  it('computes live elapsed seconds', () => {
    const base = { elapsedSec: 60, timerStatus: 'idle', timerStartedAt: null };
    expect(getLiveElapsedSec(base)).toBe(60);
    expect(formatElapsed(3661)).toContain('1h');
  });

  it('roadmap marks step 3 tasks as done', () => {
    const step3 = ORION_ROADMAP.find((s) => s.id === 'tasks');
    expect(step3?.status).toBe('done');
  });
});
