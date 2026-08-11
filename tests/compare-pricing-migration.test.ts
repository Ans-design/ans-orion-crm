import { describe, expect, it } from 'vitest';
import { MIGRATION_PILOT_ARTICLES } from '@/lib/pricing/compare-pricing-migration';

describe('compare-pricing-migration', () => {
  it('expose 10 articles pilotes représentatifs', () => {
    expect(MIGRATION_PILOT_ARTICLES).toHaveLength(10);
    expect(MIGRATION_PILOT_ARTICLES).toContain('pkg-hangtag');
    expect(MIGRATION_PILOT_ARTICLES).toContain('bk-livres');
    expect(MIGRATION_PILOT_ARTICLES).toContain('gf-bache');
    expect(MIGRATION_PILOT_ARTICLES).toContain('cv-std');
  });
});
