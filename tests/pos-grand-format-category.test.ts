import { describe, expect, it } from 'vitest';
import {
  familyToCategoryId,
  suggestCorrectCategory,
  validateArticleCategory,
} from '@/lib/pos/article-category-taxonomy';
import {
  isRedundantBacheVariant,
  isRedundantGrandFormatPosCard,
  isPlvFinishedProduct,
  isPvcPetitFormatArticle,
  isRedundantPlvDirectSaleSku,
} from '@/lib/pos/grand-format-redundant';
import { resolvePlvCanonicalId, plvLegacyPrefill } from '@/lib/pos/plv-catalog';
import {
  buildDatabasePrimaryPosItems,
  type ProfileSnapshot,
} from '@/lib/services/catalogue-pos-builder';

const ctx = {
  familyToCategoryId: (family: string | null, hint?: { articleId?: string; name?: string }) =>
    familyToCategoryId(family, hint),
  inferConfigType: () => 'grand_format',
  isVisibleInPos: () => true,
};

function profile(overrides: Partial<ProfileSnapshot>): ProfileSnapshot {
  return {
    articleId: 'x',
    articleLabel: 'X',
    family: 'Grand Format & PVC',
    prixBase: 1000,
    status: 'published',
    active: true,
    saleUnit: 'm²',
    ...overrides,
  };
}

describe('Grand Format taxonomy', () => {
  it('Roll up / X-Banner → PLV même si family = Grand Format', () => {
    expect(
      familyToCategoryId('Grand Format & PVC', {
        articleId: 'AVD008',
        name: 'Roll up standard 200x80 cm',
      }),
    ).toBe('plv');
    expect(
      familyToCategoryId('Grand Format & PVC', {
        articleId: 'AVD011',
        name: 'X-Banner 180x80 cm',
      }),
    ).toBe('plv');
    expect(suggestCorrectCategory({ name: 'Oriflamme', family: 'Grand Format & PVC' })).toBe('plv');
  });

  it('PVC opaque/translucide → Impression sans finition', () => {
    expect(suggestCorrectCategory({ articleId: 'GF008', name: 'PVC translucide' })).toBe('impression');
    expect(suggestCorrectCategory({ articleId: 'GF009', name: 'PVC opaque' })).toBe('impression');
    expect(isPvcPetitFormatArticle('PVC translucide', 'GF008')).toBe(true);
  });

  it('PVC rigide / Bâche / Vinyle restent Grand Format', () => {
    expect(suggestCorrectCategory({ articleId: 'gf-pvc', name: 'PVC rigide' })).toBe('grand_format');
    expect(suggestCorrectCategory({ articleId: 'gf-bache', name: 'Bâche' })).toBe('grand_format');
    expect(suggestCorrectCategory({ name: 'Vinyle blanc autocollant' })).toBe('grand_format');
  });

  it('détecte variantes bâche formats/paliers', () => {
    expect(isRedundantBacheVariant('Bâche 180 cm A4', 'GF001')).toBe(true);
    expect(isRedundantBacheVariant('Bâche 240/320 cm A0 palier 1-10', 'GF005')).toBe(true);
    expect(isRedundantBacheVariant('Bâche', 'gf-bache')).toBe(false);
    expect(isRedundantGrandFormatPosCard('Plexiglass', 'GF010')).toBe(true);
  });

  it('validateArticleCategory flag PLV dans Grand Format', () => {
    const v = validateArticleCategory({
      articleId: 'AVD008',
      name: 'Roll up standard 200x80 cm',
      family: 'Grand Format & PVC',
    });
    expect(v.ok).toBe(false);
    expect(v.suggestedCategoryId).toBe('plv');
  });
});

describe('POS catalogue Grand Format sans PLV ni doublons bâche', () => {
  it('filtre Roll-up SKUs, X-Banner SKUs, bâches A2/A3/A4, paliers', () => {
    const items = buildDatabasePrimaryPosItems(
      [
        profile({ articleId: 'gf-bache', articleLabel: 'Bâche', prixM2: 20000 }),
        profile({ articleId: 'GF001', articleLabel: 'Bâche 180 cm A4', prixM2: 2200 }),
        profile({ articleId: 'GF003', articleLabel: 'Bâche 180 cm A2', prixM2: 7000 }),
        profile({ articleId: 'GF005', articleLabel: 'Bâche 240/320 cm A0 palier 1-10', prixM2: 28000 }),
        profile({ articleId: 'AVD008', articleLabel: 'Roll up standard 200x80 cm', family: 'Grand Format & PVC', calculationType: 'piece' }),
        profile({ articleId: 'AVD011', articleLabel: 'X-Banner 180x80 cm', family: 'Grand Format & PVC', calculationType: 'piece' }),
        profile({ articleId: 'GF013', articleLabel: 'Roll up standard 200x80', prixM2: 150000 }),
        profile({ articleId: 'GF014', articleLabel: 'X-Banner 180x80', prixM2: 85000 }),
        profile({ articleId: 'GF008', articleLabel: 'PVC translucide' }),
        profile({ articleId: 'gf-pvc', articleLabel: 'PVC rigide' }),
        profile({ articleId: 'gf-plexi', articleLabel: 'Acrylic / Plexiglas' }),
        profile({ articleId: 'GF010', articleLabel: 'Plexiglass' }),
        profile({ articleId: 'gf-acrylic', articleLabel: 'Acrylic 1/3/5mm' }),
      ],
      {},
      'commercial',
      ctx,
    );

    const ids = items.map((i) => i.id);
    expect(ids).toContain('gf-bache');
    expect(ids).toContain('gf-pvc');
    expect(ids).toContain('gf-plexi');
    expect(ids).not.toContain('GF001');
    expect(ids).not.toContain('AVD008');
    expect(ids).not.toContain('AVD011');
    expect(ids).not.toContain('GF013');

    const gfOnly = items.filter((i) => i.category === 'grand_format');
    expect(gfOnly.every((i) => !/roll\s*up|x-?banner|bâche\s+180|palier/i.test(i.name))).toBe(true);

    // GF008 = PVC petit format → fusionné vers imp-impression (pas de carte POS séparée)
    expect(items.find((i) => i.id === 'GF008')).toBeUndefined();
    expect(suggestCorrectCategory({ articleId: 'GF008', name: 'PVC translucide' })).toBe('impression');

    const withCanon = buildDatabasePrimaryPosItems(
      [
        profile({ articleId: 'plv-rollup', articleLabel: 'Roll-up', family: 'PLV & Chevalets' }),
        profile({ articleId: 'plv-xbanner', articleLabel: 'X-Banner', family: 'PLV & Chevalets' }),
        profile({ articleId: 'AVD008', articleLabel: 'Roll up standard 200x80 cm', family: 'PLV & Chevalets' }),
        profile({ articleId: 'AVD009', articleLabel: 'Roll up deluxe 200x85 cm', family: 'PLV & Chevalets' }),
        profile({ articleId: 'AVD011', articleLabel: 'X-Banner 180x80 cm', family: 'PLV & Chevalets' }),
      ],
      {},
      'commercial',
      ctx,
    );
    const withCanonIds = withCanon.map((i) => i.id);
    expect(withCanonIds).toContain('plv-rollup');
    expect(withCanonIds).toContain('plv-xbanner');
    expect(withCanonIds).not.toContain('AVD008');
    expect(withCanonIds).not.toContain('AVD009');
    expect(withCanonIds).not.toContain('AVD011');
    expect(withCanon.filter((i) => i.id === 'plv-rollup' || i.id === 'plv-xbanner').every((i) => i.category === 'plv')).toBe(true);
  });

  it('refuse Roll-up / X-Banner / bâche format même si family = Grand Format', () => {
    const items = buildDatabasePrimaryPosItems(
      [
        profile({ articleId: 'gf-bache', articleLabel: 'Bâche' }),
        profile({
          articleId: 'AVD008',
          articleLabel: 'Roll up standard 200x80 cm',
          family: 'Grand Format & PVC',
        }),
        profile({
          articleId: 'AVD011',
          articleLabel: 'X-Banner 180x80 cm',
          family: 'Grand Format & PVC',
        }),
        profile({
          articleId: 'GF003',
          articleLabel: 'Bâche 180 cm A2',
          family: 'Grand Format & PVC',
        }),
      ],
      {},
      'commercial',
      ctx,
    );
    const ids = items.map((i) => i.id);
    expect(ids).toContain('gf-bache');
    expect(ids).not.toContain('AVD008');
    expect(ids).not.toContain('AVD011');
    expect(ids).not.toContain('GF003');
  });

  it('isPlvFinishedProduct / SKU DirectSale', () => {
    expect(isPlvFinishedProduct('Roll up standard 200x80', 'AVD008')).toBe(true);
    expect(isRedundantPlvDirectSaleSku('Roll up standard 200x80 cm', 'AVD008')).toBe(true);
    expect(isPlvFinishedProduct('Bâche', 'gf-bache')).toBe(false);
    expect(isPlvFinishedProduct('Couture Oriflammes', 'fin-couture')).toBe(false);
  });

  it('AVD → configurateur PLV avec prefill type', () => {
    expect(resolvePlvCanonicalId('AVD008')).toBe('plv-rollup');
    expect(resolvePlvCanonicalId('AVD009')).toBe('plv-rollup');
    expect(resolvePlvCanonicalId('AVD011')).toBe('plv-xbanner');
    expect(plvLegacyPrefill('AVD008')?.type).toBe('Roll-up standard');
    expect(plvLegacyPrefill('AVD009')?.type).toBe('Roll-up deluxe / premium');
    expect(plvLegacyPrefill('AVD011')?.type).toBe('X-Banner standard');
  });
});

describe('garde-fous finitions / PLV', () => {
  it('Couture Oriflammes reste finitions', () => {
    expect(suggestCorrectCategory({ name: 'Couture Oriflammes', articleId: 'fin-couture' })).toBe('finitions');
    expect(
      familyToCategoryId('PLV & Chevalets', { name: 'Couture Oriflammes', articleId: 'fin-couture' }),
    ).toBe('finitions');
  });

  it('Oriflamme produit → PLV', () => {
    expect(suggestCorrectCategory({ name: 'Oriflamme', articleId: 'AVD004' })).toBe('plv');
  });
});
