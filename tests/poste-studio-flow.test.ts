import { describe, expect, it } from 'vitest';
import { etapeToTaskType } from '@/lib/services/planning-task-sync';
import { derivePosteLabels } from '@/lib/metier/poste-labels';

describe('planning → poste métier', () => {
  it('mappe les étapes Gantt vers le type de tâche du studio', () => {
    expect(etapeToTaskType('Graphisme')).toBe('graphisme');
    expect(etapeToTaskType('03 BAT')).toBe('graphisme');
    expect(etapeToTaskType('Conception')).toBe('graphisme');
    expect(etapeToTaskType('Prépa fichier')).toBe('graphisme');
    expect(etapeToTaskType('Façonnage')).toBe('finition');
    expect(etapeToTaskType('Livraison')).toBe('logistique');
    expect(etapeToTaskType('02 Devis')).toBe('commercial');
    expect(etapeToTaskType('Impression')).toBe('production');
  });

  it('dérive les labels RH (pause / charge / rythme)', () => {
    expect(
      derivePosteLabels({
        workSec: 1200,
        pauseSec: 900,
        pauseCount: 5,
        estimatedSec: 3600,
        openCount: 2,
        finishedToday: 0,
        running: false,
      }),
    ).toContain('Trop de pause');

    expect(
      derivePosteLabels({
        workSec: 600,
        pauseSec: 0,
        pauseCount: 0,
        estimatedSec: 3600,
        openCount: 1,
        finishedToday: 5,
        running: true,
      }),
    ).toEqual(expect.arrayContaining(['Rapide', 'Dynamique', 'Motivé']));

    expect(
      derivePosteLabels({
        workSec: 100,
        pauseSec: 0,
        pauseCount: 0,
        estimatedSec: null,
        openCount: 7,
        finishedToday: 0,
        running: false,
      }),
    ).toEqual(expect.arrayContaining(['Inactivité', 'Trop de charge']));
  });
});
