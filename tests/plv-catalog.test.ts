import { describe, expect, it } from 'vitest';
import { POS_CATALOGUE } from '@/lib/data/catalogue-meta';
import { getProductConfig } from '@/lib/data/config-types';
import {
  PLV_CANONICAL_IDS,
  PLV_LEGACY_TO_CANONICAL,
  resolvePlvCanonicalId,
  plvLegacyPrefill,
} from '@/lib/pos/plv-catalog';
import { resolveCatalogCanonicalId } from '@/lib/pos/catalog-resolver';

describe('PLV catalogue fusion', () => {
  it('shows 8 PLV articles in POS catalogue', () => {
    const plv = POS_CATALOGUE.filter((a) => a.category === 'plv');
    expect(plv).toHaveLength(8);
    expect(plv.map((a) => a.id).sort()).toEqual([...PLV_CANONICAL_IDS].sort());
  });

  it('resolves all legacy PLV ids to canonical articles', () => {
    for (const [legacy, canonical] of Object.entries(PLV_LEGACY_TO_CANONICAL)) {
      expect(resolvePlvCanonicalId(legacy)).toBe(canonical);
      expect(resolveCatalogCanonicalId(legacy)).toBe(canonical);
    }
  });

  it('prefills configurateur type from legacy URLs', () => {
    expect(plvLegacyPrefill('plv-chevalet-carton')).toEqual({ type: 'Chevalet carton stop-rayon' });
    expect(plvLegacyPrefill('plv-totem-sol')).toEqual({ type: 'Totem de sol' });
    expect(plvLegacyPrefill('plv-box-palette')).toEqual({ type: 'Box palette / Bac de sol' });
  });

  it('maps legacy and canonical ids to product configs', () => {
    expect(getProductConfig('plv-chevalet-table')).toStrictEqual(getProductConfig('plv-chevalet'));
    expect(getProductConfig('plv-stop')).toStrictEqual(getProductConfig('plv-presentoir-sol'));
    expect(getProductConfig('plv-porte-brochures')).toStrictEqual(getProductConfig('plv-porte-flyers'));
    expect(getProductConfig('plv-sur-mesure')).toStrictEqual(getProductConfig('plv-presentoir-magasin'));
  });
});
