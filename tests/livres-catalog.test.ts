import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '@/lib/data/catalogue';
import { findCatalogueItem } from '@/lib/data/catalogue-meta';
import { getProductConfig } from '@/lib/data/config-types';
import {
  LIVRES_CANONICAL_ID,
  LIVRES_LEGACY_IDS,
  LIVRES_TYPES,
  resolveLivresCanonicalId,
} from '@/lib/pos/livres-catalog';
import {
  catalogLegacyRedirectTarget,
  resolveCatalogCanonicalId,
} from '@/lib/pos/catalog-resolver';

describe('livres catalog fusion', () => {
  it('single catalogue entry bk-livres in livres category', () => {
    const livres = CATALOGUE.filter((a) => a.category === 'livres');
    expect(livres).toHaveLength(1);
    expect(livres[0].id).toBe(LIVRES_CANONICAL_ID);
  });

  it('legacy IDs redirect to bk-livres with type prefill', () => {
    for (const legacy of LIVRES_LEGACY_IDS) {
      expect(resolveCatalogCanonicalId(legacy)).toBe(LIVRES_CANONICAL_ID);
      expect(catalogLegacyRedirectTarget(legacy)).toBe(LIVRES_CANONICAL_ID);
    }
    expect(resolveLivresCanonicalId('bk-booklet')).toBe(LIVRES_CANONICAL_ID);
    expect(findCatalogueItem('bk-livret')?.id).toBe(LIVRES_CANONICAL_ID);
  });

  it('config has unified type chips including booklet, livret, magazine, menus', () => {
    const cfg = getProductConfig('bk-livres');
    const typeField = cfg?.sections.flatMap((s) => s.fields).find((f) => f.key === 'type');
    expect(typeField?.options).toEqual([...LIVRES_TYPES]);
    expect(typeField?.options).toContain('Booklet');
    expect(typeField?.options).toContain('Livret');
    expect(typeField?.options).toContain('Magazine');
    expect(typeField?.options).not.toContain('Menu plié');
    expect(typeField?.options).toContain('Mémoire / thèse');
  });

  it('reliure filtered by type', () => {
    const cfg = getProductConfig('bk-livres');
    const reliure = cfg?.sections.flatMap((s) => s.fields).find((f) => f.key === 'reliure');
    expect(reliure?.optionsFilter?.optionsByValue['Booklet']).toContain('Spirale plastique');
    expect(reliure?.optionsFilter?.optionsByValue['Magazine']).toContain('Dos carré collé');
    expect(reliure?.optionsFilter?.optionsByValue['Menu plastifié']).toContain('Pelliculé');
  });

  it('legacy article IDs still resolve to same config', () => {
    for (const id of ['bk-booklet', 'bk-menu', 'bk-magazine']) {
      expect(getProductConfig(id)).toStrictEqual(getProductConfig('bk-livres'));
    }
  });
});
