import { describe, expect, it } from 'vitest';
import { POS_CATALOGUE } from '@/lib/data/catalogue-meta';
import { resolvePosCatalogEntryPrice } from '@/lib/pos/pos-catalog-entry-price';
import { getPrix2026EntryUnitPrice, articleHasPrix2026Grid } from '@/lib/data/prix-2026-grids';
import { lookupCatalogueArticles2026EntryByPosId } from '@/lib/backoffice/catalogue-articles-2026-entry-lookup';
import { isPosParentArticleId } from '@/lib/pos/article-2026-canonical-map';

/**
 * Les parents POS ne doivent pas afficher un « à partir de » inventé à 0
 * quand une grille Excel / Catalogue Articles 2026 / moteur existe.
 */
describe('POS parents — prix d’entrée non nuls (où SoT existe)', () => {
  const parents = POS_CATALOGUE.filter((a) => isPosParentArticleId(a.id));

  it('catalogue parents gelés présents (~95)', () => {
    expect(parents.length).toBeGreaterThanOrEqual(80);
    expect(parents.length).toBeLessThanOrEqual(120);
  });

  it('grilles PRIX 2026 runtime : plus d’articles Excel (stubs)', () => {
    const withGrid = parents.filter((a) => articleHasPrix2026Grid(a.id));
    expect(withGrid.length).toBe(0);
    expect(getPrix2026EntryUnitPrice('cv-std')).toBeNull();
  });

  it('entrée POS via moteurs / catalogue articles 2026 (hors Excel runtime)', () => {
    let covered = 0;
    for (const a of parents.slice(0, 40)) {
      const entry = resolvePosCatalogEntryPrice(a.id)
        ?? lookupCatalogueArticles2026EntryByPosId(a.id);
      if (entry != null && entry > 0) covered += 1;
    }
    // Au moins quelques SKU couverts hors Excel stub
    expect(covered).toBeGreaterThan(0);
  });

  it('Catalogue Articles 2026 : mins POS mappés > 0', () => {
    const ids = [
      'cv-std',
      'fly-std',
      'plv-rollup',
      'tx-tshirt',
      'gd-mug',
      'gd-stylo',
    ];
    for (const id of ids) {
      const n = lookupCatalogueArticles2026EntryByPosId(id) ?? resolvePosCatalogEntryPrice(id);
      expect(n, id).toBeTruthy();
      expect(n!, id).toBeGreaterThan(0);
    }
  });

  it('bk-livres : prix calculé (pas carte entry fixe) — pas d’exigence entry grille', () => {
    // Livres = moteur publications (ISF × pages) ; pas de grille entry fixe.
    expect(articleHasPrix2026Grid('bk-livres')).toBe(false);
    const entry = resolvePosCatalogEntryPrice('bk-livres');
    // Peut être null hors DB — OK tant que le moteur publications calcule > 0
    expect(entry == null || entry > 0).toBe(true);
  });
});
