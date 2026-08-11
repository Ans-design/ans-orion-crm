/**
 * B-07 — stock list helpers (items / anomalies / movements).
 */
import { describe, expect, it } from 'vitest';
import { unwrapListItems } from '@/lib/api-client';

describe('B-07 unwrapListItems stock shapes', () => {
  it('ok({ items, stats })', () => {
    const body = {
      ok: true as const,
      data: { items: [{ id: 's1', label: 'Papier' }], stats: { total: 1 } },
    };
    expect(unwrapListItems(body)).toEqual([{ id: 's1', label: 'Papier' }]);
  });

  it('ok(anomalies array)', () => {
    const body = { ok: true as const, data: [{ sku: 'A', issue: 'negatif' }] };
    expect(unwrapListItems(body)).toHaveLength(1);
  });

  it('ok(movements array)', () => {
    expect(unwrapListItems({ ok: true, data: [{ id: 'm1' }, { id: 'm2' }] })).toHaveLength(2);
  });

  it('legacy { items }', () => {
    expect(unwrapListItems({ items: [{ id: 'x' }] })).toEqual([{ id: 'x' }]);
  });
});
