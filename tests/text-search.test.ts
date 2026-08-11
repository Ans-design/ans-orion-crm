import { describe, expect, it } from 'vitest';
import {
  SEARCH_MIN_CHARS,
  normalizeSearchTerm,
  buildTextSearchOr,
  applyTextSearchWhere,
} from '@/lib/server/search/text-search';

describe('text-search', () => {
  it('normalizeSearchTerm — ignore les termes trop courts', () => {
    expect(normalizeSearchTerm('')).toBeUndefined();
    expect(normalizeSearchTerm('a')).toBeUndefined();
    expect(normalizeSearchTerm('ab')).toBe('ab');
    expect(normalizeSearchTerm('  client  ')).toBe('client');
  });

  it('buildTextSearchOr — retourne undefined si terme invalide', () => {
    expect(buildTextSearchOr('x', [(q) => ({ name: q })])).toBeUndefined();
    const or = buildTextSearchOr('client', [(q) => ({ name: q }), (q) => ({ code: q })]);
    expect(or).toHaveLength(2);
  });

  it('applyTextSearchWhere — ajoute OR sur le where', () => {
    const where: Record<string, unknown> = { actif: true };
    applyTextSearchWhere(where, 'papier', ['sku', 'label']);
    expect(where.actif).toBe(true);
    expect(Array.isArray(where.OR)).toBe(true);
    expect((where.OR as unknown[]).length).toBe(2);
  });

  it('SEARCH_MIN_CHARS est 2', () => {
    expect(SEARCH_MIN_CHARS).toBe(2);
  });
});
