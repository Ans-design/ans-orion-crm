import { describe, expect, it } from 'vitest';
import { POS_CATALOGUE, findCatalogueItem } from '@/lib/data/catalogue-meta';
import { getProductConfig } from '@/lib/data/config-types';
import {
  FLYER_CANONICAL_ID,
  FLYER_FORMAT_OPTIONS,
  flyerLegacyPrefill,
  resolveFlyerCanonicalId,
} from '@/lib/pos/flyer-catalog';
import {
  catalogLegacyRedirectTarget,
  resolveCatalogCanonicalId,
} from '@/lib/pos/catalog-resolver';

describe('flyer catalogue fusion', () => {
  it('expose un seul flyer dans le catalogue POS', () => {
    const flyers = POS_CATALOGUE.filter((a) => a.category === 'flyers');
    expect(flyers).toHaveLength(1);
    expect(flyers[0]?.id).toBe(FLYER_CANONICAL_ID);
    expect(flyers[0]?.name).toBe('Flyer');
  });

  it('résout les IDs legacy vers fly-std', () => {
    expect(resolveFlyerCanonicalId('fly-a6')).toBe(FLYER_CANONICAL_ID);
    expect(resolveCatalogCanonicalId('fly-a4')).toBe(FLYER_CANONICAL_ID);
    expect(findCatalogueItem('fly-a5')?.id).toBe(FLYER_CANONICAL_ID);
  });

  it('préremplit le format depuis les URLs legacy', () => {
    expect(flyerLegacyPrefill('fly-a6')).toEqual({ format: 'A6 — 105×148 mm' });
    expect(flyerLegacyPrefill('fly-90')).toEqual({ format: 'Carré — 90×90 mm' });
    expect(catalogLegacyRedirectTarget('fly-dl')).toBe(FLYER_CANONICAL_ID);
  });

  it('configurateur unique avec tous les formats', () => {
    const cfg = getProductConfig(FLYER_CANONICAL_ID, 'flyer');
    const formatField = cfg?.sections.find((s) => s.title === 'Format')?.fields[0];
    expect(formatField?.options).toEqual([...FLYER_FORMAT_OPTIONS]);
    expect(formatField?.options).toContain('B5 — 176×250 mm');
    expect(formatField?.options).toContain('Carré — 90×90 mm');
    expect(cfg?.sections.some((s) => s.title === 'Plis / volets')).toBe(true);
  });
});
