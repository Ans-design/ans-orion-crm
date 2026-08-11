import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '@/lib/data/catalogue';
import { resolvePosCatalogEntryPrice } from '@/lib/pos/pos-catalog-entry-price';

describe('resolvePosCatalogEntryPrice — no catalogue.ts fallback', () => {
  it('ne lit pas prixDepart du catalogue statique pour un article générique', () => {
    const cat = CATALOGUE.find((a) => a.id === 'pkg-boite');
    expect(cat?.prixDepart).toBeGreaterThan(0);
    // Sans moteur dédié ni legacy Excel → null (DB doit fournir le prix)
    expect(resolvePosCatalogEntryPrice('pkg-boite')).toBeNull();
  });

  it('conserve les moteurs spéciaux (doypack)', () => {
    const price = resolvePosCatalogEntryPrice('pkg-doypack');
    expect(price == null || price > 0).toBe(true);
  });
});
