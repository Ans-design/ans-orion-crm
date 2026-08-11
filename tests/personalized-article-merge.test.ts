import { describe, expect, it } from 'vitest';
import {
  isRedundantPersonalizedArticle,
  resolvePersonalizedCanonical,
  resolvePersonalizedCanonicalId,
  isOfficialPersonalizedArticle,
} from '@/lib/pos/personalized-article-redundant';
import { resolveCatalogCanonicalId, catalogLegacyPrefill } from '@/lib/pos/catalog-resolver';
import { POS_HIDDEN_ARTICLE_IDS } from '@/lib/data/catalogue-meta';
import {
  buildDatabasePrimaryPosItems,
  type ProfileSnapshot,
} from '@/lib/services/catalogue-pos-builder';
import { familyToCategoryId } from '@/lib/pos/article-category-taxonomy';

const ctx = {
  familyToCategoryId: (family: string | null, hint?: { articleId?: string; name?: string }) =>
    familyToCategoryId(family, hint),
  inferConfigType: () => 'textile',
  isVisibleInPos: () => true,
};

function profile(overrides: Partial<ProfileSnapshot>): ProfileSnapshot {
  return {
    articleId: 'x',
    articleLabel: 'X',
    family: 'Textiles',
    prixBase: 9000,
    status: 'published',
    active: true,
    saleUnit: 'pièce',
    ...overrides,
  };
}

describe('Personalized article duplicates', () => {
  it('mappe AVD textile/goodies vers canoniques', () => {
    expect(resolvePersonalizedCanonical('Bob personnalisé', 'AVD022')?.canonicalId).toBe('tx-bob');
    expect(resolvePersonalizedCanonical('Casquette personnalisée', 'AVD021')?.canonicalId).toBe(
      'tx-casquette',
    );
    expect(resolvePersonalizedCanonical('Polo personnalisé 220g', 'AVD020')).toMatchObject({
      canonicalId: 'tx-polo',
      prefill: { grammage: '220g' },
    });
    expect(resolvePersonalizedCanonicalId('AVD019')).toBe('tx-tshirt');
    expect(resolveCatalogCanonicalId('AVD024')).toBe('gd-mug');
    expect(catalogLegacyPrefill('AVD020')).toEqual({ grammage: '220g' });
  });

  it('ne fusionne pas les noms officiels catalogue', () => {
    expect(isOfficialPersonalizedArticle('pkg-gobelet', 'Gobelet personnalisé')).toBe(true);
    expect(isRedundantPersonalizedArticle('Gobelet personnalisé', 'pkg-gobelet')).toBe(false);
    expect(isRedundantPersonalizedArticle('Housse personnalisée', 'gd-housse')).toBe(false);
    expect(isRedundantPersonalizedArticle('Bob', 'tx-bob')).toBe(false);
  });

  it('détecte les doublons personnalisés', () => {
    expect(isRedundantPersonalizedArticle('Bob personnalisé', 'AVD022')).toBe(true);
    expect(isRedundantPersonalizedArticle('Mug personnalisé', 'AVD024')).toBe(true);
  });

  it('masque AVD019–029 dans POS_HIDDEN', () => {
    expect(POS_HIDDEN_ARTICLE_IDS.has('AVD022')).toBe(true);
    expect(POS_HIDDEN_ARTICLE_IDS.has('AVD020')).toBe(true);
  });

  it('builder POS n’expose qu’un Bob / une Casquette / un Polo', () => {
    const items = buildDatabasePrimaryPosItems(
      [
        profile({ articleId: 'tx-bob', articleLabel: 'Bob', prixBase: 9000 }),
        profile({ articleId: 'AVD022', articleLabel: 'Bob personnalisé', prixBase: 13000 }),
        profile({ articleId: 'tx-casquette', articleLabel: 'Casquette', prixBase: 9000 }),
        profile({
          articleId: 'AVD021',
          articleLabel: 'Casquette personnalisée',
          prixBase: 13000,
        }),
        profile({ articleId: 'tx-polo', articleLabel: 'Polo', prixBase: 27000 }),
        profile({
          articleId: 'AVD020',
          articleLabel: 'Polo personnalisé 220g',
          prixBase: 44000,
        }),
      ],
      {},
      'commercial',
      ctx,
    );
    const ids = items.map((i) => i.id);
    expect(ids).toContain('tx-bob');
    expect(ids).toContain('tx-casquette');
    expect(ids).toContain('tx-polo');
    expect(ids).not.toContain('AVD022');
    expect(ids).not.toContain('AVD021');
    expect(ids).not.toContain('AVD020');
    // Variantes AVD absentes ; libellés « personnalisé » éventuels = seed catalogue parent OK
    expect(items.filter((i) => /^AVD/i.test(i.id)).length).toBe(0);
  });
});
