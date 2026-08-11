import { describe, expect, it } from 'vitest';
import { posCatalogueCount, POS_CATALOGUE } from '@/lib/data/catalogue-meta';

describe('pos catalogue count', () => {
  it('exposes exactly 95 articles in POS (catalogue − masqués dont e2e-bo-pos)', () => {
    expect(posCatalogueCount()).toBe(95);
    expect(POS_CATALOGUE).toHaveLength(95);
  });
});
