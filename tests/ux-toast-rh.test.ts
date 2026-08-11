import { describe, expect, it } from 'vitest';
import { stageWeightFromLabel } from '@/components/rh/candidate-score-radar';
import { uxToast } from '@/lib/ux/feedback';

describe('stageWeightFromLabel', () => {
  it('orders pipeline stages', () => {
    expect(stageWeightFromLabel('Présélection')).toBeLessThan(stageWeightFromLabel('Recruté'));
    expect(stageWeightFromLabel('Refusé')).toBe(0.1);
  });
});

describe('uxToast API', () => {
  it('exposes warn / info / success variants', () => {
    expect(typeof uxToast.warn).toBe('function');
    expect(typeof uxToast.info).toBe('function');
    expect(typeof uxToast.success).toBe('function');
    expect(typeof uxToast.error).toBe('function');
  });
});
