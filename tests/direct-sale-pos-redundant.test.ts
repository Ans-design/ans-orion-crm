import { describe, expect, it } from 'vitest';
import {
  DIRECT_SALE_POS_CANONICAL,
  isRedundantDirectSalePosSku,
  resolveDirectSalePosCanonical,
  directSalePosPrefill,
} from '@/lib/pos/direct-sale-pos-redundant';
import { resolveCatalogCanonicalId, catalogLegacyPrefill } from '@/lib/pos/catalog-resolver';
import { POS_HIDDEN_ARTICLE_IDS } from '@/lib/data/catalogue-meta';

describe('DirectSale POS redundant (Carterie / Flyers)', () => {
  it('mappe AVD012–014 / 016–018 vers canoniques', () => {
    expect(DIRECT_SALE_POS_CANONICAL.AVD012).toBe('cv-fidelite');
    expect(DIRECT_SALE_POS_CANONICAL.AVD013).toBe('cv-std');
    expect(DIRECT_SALE_POS_CANONICAL.AVD014).toBe('cv-std');
    expect(DIRECT_SALE_POS_CANONICAL.AVD016).toBe('fly-std');
    expect(DIRECT_SALE_POS_CANONICAL.AVD017).toBe('fly-std');
    expect(DIRECT_SALE_POS_CANONICAL.AVD018).toBe('fly-std');
  });

  it('résout via catalog-resolver', () => {
    expect(resolveCatalogCanonicalId('AVD013')).toBe('cv-std');
    expect(resolveCatalogCanonicalId('AVD017')).toBe('fly-std');
    expect(catalogLegacyPrefill('AVD014')).toEqual({ face: 'Recto-verso' });
    expect(catalogLegacyPrefill('AVD017')?.format).toContain('90×90');
  });

  it('détecte les SKUs redondants', () => {
    expect(isRedundantDirectSalePosSku('Flyers 90x90 mm recto', 'AVD017')).toBe(true);
    expect(isRedundantDirectSalePosSku('Flyer', 'fly-std')).toBe(false);
    expect(resolveDirectSalePosCanonical('Carte de visite recto standard', 'AVD013')).toBe('cv-std');
  });

  it('masque volume global + AVD carterie/flyers', () => {
    expect(POS_HIDDEN_ARTICLE_IDS.has('__volume_global__')).toBe(true);
    expect(POS_HIDDEN_ARTICLE_IDS.has('AVD012')).toBe(true);
    expect(POS_HIDDEN_ARTICLE_IDS.has('AVD016')).toBe(true);
  });

  it('prefill AVD016 A4 RV', () => {
    expect(directSalePosPrefill('AVD016')).toEqual({
      format: 'A4 — 210×297 mm',
      face: 'Recto-verso',
    });
  });
});
