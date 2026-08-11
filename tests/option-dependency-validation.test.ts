import { describe, expect, it } from 'vitest';
import {
  findFieldCycles,
  validateOptionDependencies,
  wouldCreateBlockingIssue,
} from '@/lib/backoffice/option-dependency-validation';

describe('option-dependency-validation (§14)', () => {
  it('detects field cycles A→B→A', () => {
    const cycles = findFieldCycles([
      { sourceField: 'matiere', targetField: 'finition' },
      { sourceField: 'finition', targetField: 'matiere' },
    ]);
    expect(cycles.length).toBeGreaterThan(0);
    expect(cycles[0].join('→')).toContain('matiere');
  });

  it('blocks self-edge and cycle on upsert preview', () => {
    const self = wouldCreateBlockingIssue([], {
      articleId: 'a1',
      sourceField: 'matiere',
      sourceValue: 'x',
      targetField: 'matiere',
    });
    expect(self?.code).toBe('SELF_EDGE');

    const cycle = wouldCreateBlockingIssue(
      [
        {
          id: '1',
          articleId: 'a1',
          sourceField: 'matiere',
          sourceValue: 'pcb',
          targetField: 'finition',
        },
      ],
      {
        articleId: 'a1',
        sourceField: 'finition',
        sourceValue: 'mat',
        targetField: 'matiere',
      },
    );
    expect(cycle?.code).toBe('CYCLE');
  });

  it('flags show/hide contradiction as warning', () => {
    const issues = validateOptionDependencies([
      {
        id: '1',
        articleId: 'a1',
        sourceField: 'qty',
        sourceValue: '100',
        targetField: 'pack',
        action: 'show',
      },
      {
        id: '2',
        articleId: 'a1',
        sourceField: 'qty',
        sourceValue: '100',
        targetField: 'pack',
        action: 'hide',
      },
    ]);
    expect(issues.some((i) => i.code === 'CONTRADICTION' && i.severity === 'warning')).toBe(true);
  });

  it('allows acyclic filter chains', () => {
    const block = wouldCreateBlockingIssue(
      [
        {
          id: '1',
          articleId: 'a1',
          sourceField: 'matiere',
          sourceValue: 'pvc',
          targetField: 'finition',
        },
      ],
      {
        articleId: 'a1',
        sourceField: 'finition',
        sourceValue: 'mat',
        targetField: 'angle',
      },
    );
    expect(block).toBeNull();
  });
});
