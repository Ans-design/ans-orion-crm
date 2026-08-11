import { describe, expect, it } from 'vitest';
import { aggregateTaskKpis, buildTaskEvaluation, parseTaskEvaluation } from '@/lib/metier/task-evaluation';

describe('task-evaluation', () => {
  it('builds and parses evaluation', () => {
    const ev = buildTaskEvaluation({ quality: 5, delay: 4, comment: 'OK' }, 'Jean');
    const parsed = parseTaskEvaluation(ev);
    expect(parsed?.quality).toBe(5);
    expect(parsed?.delay).toBe(4);
  });

  it('aggregates assignee KPIs', () => {
    const ev = buildTaskEvaluation({ quality: 4, delay: 5 }, 'Op1');
    const kpis = aggregateTaskKpis([
      { assigneeName: 'Op1', status: 'Terminée', elapsedSec: 1800, estimatedMin: 30, evaluation: ev },
      { assigneeName: 'Op1', status: 'Terminée', elapsedSec: 900, estimatedMin: 20, evaluation: null },
      { assigneeName: 'Op2', status: 'En cours', elapsedSec: 0, estimatedMin: null, evaluation: null },
    ]);
    expect(kpis).toHaveLength(1);
    expect(kpis[0].assigneeName).toBe('Op1');
    expect(kpis[0].completed).toBe(2);
    expect(kpis[0].avgQuality).toBe(4);
  });
});
