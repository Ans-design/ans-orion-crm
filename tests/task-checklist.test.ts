import { describe, expect, it } from 'vitest';
import {
  checklistProgress,
  DEFAULT_PRODUCTION_CHECKLIST,
  parseTaskChecklist,
} from '@/lib/metier/task-checklist';

describe('task-checklist', () => {
  it('parses checklist items', () => {
    const items = parseTaskChecklist(DEFAULT_PRODUCTION_CHECKLIST);
    expect(items.length).toBe(4);
  });

  it('computes progress', () => {
    const items = DEFAULT_PRODUCTION_CHECKLIST.map((x, i) => ({ ...x, done: i < 2 }));
    expect(checklistProgress(items)).toEqual({ done: 2, total: 4, pct: 50 });
  });
});
