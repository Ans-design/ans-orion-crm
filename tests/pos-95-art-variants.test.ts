import { describe, expect, it } from 'vitest';
import { posCatalogueCount, POS_CATALOGUE } from '@/lib/data/catalogue-meta';
import {
  getCatalogueArticles2026Workbook,
  resolveCanonicalPosId,
} from '@/lib/backoffice/catalogue-articles-2026-excel-format';
import {
  isPosCatalogueParentCard,
  isPosParentArticleId,
  resolveArticle2026CanonicalPosId,
} from '@/lib/pos/article-2026-canonical-map';

describe('refonte 95 parents + ART variantes', () => {
  it('gèle exactement 95 articles POS', () => {
    expect(posCatalogueCount()).toBe(95);
    expect(POS_CATALOGUE).toHaveLength(95);
  });

  it('mappe 100 % des ART Excel vers un parent POS', () => {
    const wb = getCatalogueArticles2026Workbook(true);
    expect(wb.articles.length).toBeGreaterThanOrEqual(200);
    const unmapped: string[] = [];
    for (const row of wb.articles) {
      const id = resolveCanonicalPosId(row);
      expect(id).toBeTruthy();
      expect(isPosParentArticleId(id)).toBe(true);
      if (id === 'fin-autres') unmapped.push(`${row.ref}:${row.article}`);
    }
    // fin-autres = dernier recours ; doit rester rare
    expect(unmapped.length).toBeLessThanOrEqual(5);
  });

  it('rattache CV / flyer / bloc-note / t-shirt aux bons parents', () => {
    expect(
      resolveArticle2026CanonicalPosId({
        ref: 'ART-007',
        family: 'Cartes',
        article: 'Carte de visite',
        variant: 'PCB',
      }),
    ).toBe('cv-std');
    expect(
      resolveArticle2026CanonicalPosId({
        ref: 'ART-001',
        family: 'Flyers',
        article: 'Flyer A6',
        variant: '',
      }),
    ).toBe('fly-std');
    expect(
      resolveArticle2026CanonicalPosId({
        ref: 'ART-055',
        family: 'Textiles',
        article: 'T-shirt 170 g',
        variant: 'Taille M',
      }),
    ).toBe('tx-tshirt');
    expect(
      resolveArticle2026CanonicalPosId({
        ref: 'ART-144',
        family: 'Calendriers',
        article: 'Calendrier chevalet',
        variant: '6 feuillets',
      }),
    ).toBe('cal-chevalet');
  });

  it('n’affiche pas ART-xxx comme carte Prix articles / POS', () => {
    expect(
      isPosCatalogueParentCard({
        excelId: 'ART-007',
        name: 'Carte de visite — PCB',
        visiblePOS: true,
        status: 'published',
      }),
    ).toBe(false);
    expect(
      isPosCatalogueParentCard({
        excelId: 'cv-std',
        reference: 'cv-std',
        name: 'Carte de visite',
        visiblePOS: true,
        status: 'published',
      }),
    ).toBe(true);
  });
});
