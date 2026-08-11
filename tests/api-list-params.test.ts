import { describe, expect, it } from 'vitest';
import { parseListParams, API_LIST_MAX_LIMIT } from '@/lib/api-list-params';

describe('api-list-params', () => {
  it('parse page et limit par défaut', () => {
    const p = parseListParams(new URLSearchParams());
    expect(p.page).toBe(1);
    expect(p.limit).toBe(40);
    expect(p.offset).toBe(0);
  });

  it('plafonne limit à API_LIST_MAX_LIMIT', () => {
    const p = parseListParams(new URLSearchParams('limit=500&page=2'));
    expect(p.limit).toBe(API_LIST_MAX_LIMIT);
    expect(p.offset).toBe(API_LIST_MAX_LIMIT);
  });

  it('rejette limit invalide', () => {
    const p = parseListParams(new URLSearchParams('limit=0'));
    expect(p.limit).toBe(1);
  });
});
