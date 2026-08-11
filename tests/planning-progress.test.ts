import { describe, expect, it } from 'vitest';
import {
  computeTaskProgressPct,
  resolveGanttSlotProgress,
  PLANNING_STATUT_PROGRESS,
} from '@/lib/planning/planning-ui';

describe('planning progress (tâches réelles)', () => {
  it('Planifié n’est plus un faux 28%', () => {
    expect(PLANNING_STATUT_PROGRESS.Planifié).toBe(0);
    expect(resolveGanttSlotProgress({ slotStatut: 'Planifié' })).toBe(0);
  });

  it('calcule le % selon l’état des tâches', () => {
    expect(
      computeTaskProgressPct([
        { status: 'Terminée' },
        { status: 'Terminée' },
        { status: 'À faire' },
        { status: 'À faire' },
      ]),
    ).toBe(50);

    expect(
      computeTaskProgressPct([
        { status: 'En cours' },
        { status: 'À faire' },
      ]),
    ).toBe(25);

    expect(computeTaskProgressPct([{ status: 'Terminée' }])).toBe(100);
    expect(computeTaskProgressPct([])).toBeNull();
  });

  it('priorise tâches > avancement commande > statut créneau', () => {
    expect(
      resolveGanttSlotProgress({
        taskProgress: 40,
        commandeAvancement: 80,
        slotStatut: 'Planifié',
      }),
    ).toBe(40);
    expect(
      resolveGanttSlotProgress({
        taskProgress: null,
        commandeAvancement: 80,
        slotStatut: 'Planifié',
      }),
    ).toBe(80);
  });
});
