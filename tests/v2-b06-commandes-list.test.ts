/**
 * B-06 — unwrapListItems / unwrapPaginated pour GET /api/commandes.
 */
import { describe, expect, it } from 'vitest';
import { unwrapListItems, unwrapPaginated } from '@/lib/api-client';
import { wantsPagination } from '@/lib/api-pagination';

describe('B-06 unwrapListItems commandes', () => {
  it('accepte tableau brut', () => {
    expect(unwrapListItems([{ id: '1' }])).toEqual([{ id: '1' }]);
  });

  it('accepte { items }', () => {
    expect(unwrapListItems({ items: [{ id: 'a' }], total: 1 })).toEqual([{ id: 'a' }]);
  });

  it('accepte { commandes }', () => {
    expect(unwrapListItems({ commandes: [{ id: 'c' }] })).toEqual([{ id: 'c' }]);
  });

  it('accepte enveloppe { ok, data: { items } }', () => {
    expect(
      unwrapListItems({ ok: true, data: { items: [{ id: 'x' }], total: 1 } }),
    ).toEqual([{ id: 'x' }]);
  });

  it('enveloppe { ok, data: [] }', () => {
    expect(unwrapListItems({ ok: true, data: [{ id: 'y' }] })).toEqual([{ id: 'y' }]);
  });

  it('corps invalide → []', () => {
    expect(unwrapListItems(null)).toEqual([]);
    expect(unwrapListItems({ ok: true, data: { foo: 1 } })).toEqual([]);
  });
});

describe('B-06 unwrapPaginated', () => {
  it('page depuis items', () => {
    const p = unwrapPaginated({ items: [1, 2], total: 10, page: 2, pageSize: 2, totalPages: 5 });
    expect(p.items).toEqual([1, 2]);
    expect(p.total).toBe(10);
    expect(p.page).toBe(2);
    expect(p.totalPages).toBe(5);
  });

  it('tableau plat', () => {
    const p = unwrapPaginated(['a', 'b']);
    expect(p.items).toEqual(['a', 'b']);
    expect(p.totalPages).toBe(1);
  });
});

describe('B-06 wantsPagination + limit', () => {
  it('pagination ON par défaut', () => {
    expect(wantsPagination(new URLSearchParams())).toBe(true);
    expect(wantsPagination(new URLSearchParams('limit=12'))).toBe(true);
  });

  it('opt-out explicite all=1', () => {
    expect(wantsPagination(new URLSearchParams('all=1'))).toBe(false);
  });
});
