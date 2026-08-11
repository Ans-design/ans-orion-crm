import { describe, expect, it } from 'vitest';
import {
  resolveConsumableLevel,
  consumFillTone,
  utilFillTone,
} from '@/lib/machines/consumable-level';

describe('resolveConsumableLevel', () => {
  it('uses used/capacity fields', () => {
    const level = resolveConsumableLevel({ used: 7, capacity: 10, unit: 'plumes' });
    expect(level).toEqual({
      pct: 30,
      remaining: 3,
      used: 7,
      capacity: 10,
      unit: 'plumes',
      label: '3 / 10 plumes',
    });
    expect(consumFillTone(level!.pct)).toBe('warn');
  });

  it('parses qty fraction 7/10', () => {
    const level = resolveConsumableLevel({ qty: '7/10' });
    expect(level?.pct).toBe(30);
    expect(level?.remaining).toBe(3);
  });

  it('returns null without level data', () => {
    expect(resolveConsumableLevel({ qty: '2L' })).toBeNull();
  });
});

describe('utilFillTone', () => {
  it('maps thresholds', () => {
    expect(utilFillTone(50)).toBe('ok');
    expect(utilFillTone(70)).toBe('warn');
    expect(utilFillTone(90)).toBe('crit');
  });
});
