import { describe, expect, it } from 'vitest';
import {
  familyToCategoryId,
  suggestCorrectCategory,
  validateArticleCategory,
  normalizeCategoryId,
  looksLikeFinishingOnly,
} from '@/lib/pos/article-category-taxonomy';
import {
  buildDatabasePrimaryPosItems,
  type ProfileSnapshot,
} from '@/lib/services/catalogue-pos-builder';

const ctx = {
  familyToCategoryId: (family: string | null, hint?: { articleId?: string; name?: string }) =>
    familyToCategoryId(family, hint),
  inferConfigType: () => 'standard',
  isVisibleInPos: () => true,
};

function profile(overrides: Partial<ProfileSnapshot>): ProfileSnapshot {
  return {
    articleId: 'x',
    articleLabel: 'X',
    family: null,
    prixBase: 1000,
    status: 'published',
    active: true,
    saleUnit: 'pièce',
    ...overrides,
  };
}

describe('article-category-taxonomy', () => {
  it('ne mappe plus les familles inconnues vers finitions', () => {
    expect(familyToCategoryId('Textile', { name: 'Bob personnalisé', articleId: 'AVD022' })).toBe('textile');
    expect(familyToCategoryId('Cartes', { name: 'Carte de visite standard' })).toBe('carterie');
    expect(familyToCategoryId('Impression petit format', { name: 'Flyers 90x90 mm recto' })).toBe('flyers');
    expect(familyToCategoryId(null, { name: 'Casquette personnalisée' })).toBe('textile');
    expect(familyToCategoryId('InconnuXYZ')).not.toBe('finitions');
  });

  it('garde les finitions dans Finitions & Reliures', () => {
    expect(suggestCorrectCategory({ name: 'Collage format A4 — A4', family: 'Collage' })).toBe('finitions');
    expect(suggestCorrectCategory({ name: 'Découpe photobooth PVC/Plexi — m2', family: 'Découpe' })).toBe('finitions');
    expect(suggestCorrectCategory({ name: 'Dorure / argenture', articleId: 'fin-dorure' })).toBe('finitions');
    expect(suggestCorrectCategory({ name: 'Coins arrondis', articleId: 'fin-coins' })).toBe('finitions');
    expect(looksLikeFinishingOnly('Pelliculage mat')).toBe(true);
  });

  it('suggère Textiles / Carterie / Flyers pour les produits finis', () => {
    expect(suggestCorrectCategory({ articleId: 'AVD022', name: 'Bob personnalisé', family: 'Textile' })).toBe('textile');
    expect(suggestCorrectCategory({ articleId: 'AVD021', name: 'Casquette personnalisée' })).toBe('textile');
    expect(suggestCorrectCategory({ articleId: 'AVD013', name: 'Carte de visite recto standard', family: 'Cartes' })).toBe('carterie');
    expect(suggestCorrectCategory({ articleId: 'AVD012', name: 'Carte de fidélité standard' })).toBe('carterie');
    expect(suggestCorrectCategory({ articleId: 'AVD017', name: 'Flyers 90x90 mm recto', family: 'Impression petit format' })).toBe('flyers');
    expect(suggestCorrectCategory({ articleId: 'AVD018', name: 'Flyers 90x90 mm recto-verso' })).toBe('flyers');
  });

  it('validateArticleCategory détecte textile dans finitions', () => {
    const v = validateArticleCategory({
      name: 'Bob personnalisé',
      articleId: 'AVD022',
      family: 'Finitions & Reliures',
    });
    expect(v.ok).toBe(false);
    expect(v.suggestedCategoryId).toBe('textile');
    expect(v.issues.some((i) => i.code === 'textile_in_finitions' || i.code === 'finished_product_in_finitions' || i.code === 'incoherent')).toBe(true);
  });

  it('normalizeCategoryId accepte alias', () => {
    expect(normalizeCategoryId('Textile')).toBe('textile');
    expect(normalizeCategoryId('Finitions & Reliures')).toBe('finitions');
    expect(normalizeCategoryId('cartes')).toBe('carterie');
  });
});

describe('POS catalogue — Finitions sans produits finis', () => {
  it('Bob / Casquette / Cartes / Flyers ne tombent pas dans finitions', () => {
    // AVD DirectSale = cartes fusionnées (tx-bob, cv-std, fly-std…) — absentes du POS.
    // On vérifie les canoniques + finitions réelles, et qu’aucun produit fini n’est en finitions.
    const items = buildDatabasePrimaryPosItems(
      [
        profile({ articleId: 'tx-bob', articleLabel: 'Bob', family: 'Textile' }),
        profile({ articleId: 'tx-casquette', articleLabel: 'Casquette', family: 'Textile' }),
        profile({ articleId: 'AVD022', articleLabel: 'Bob personnalisé', family: 'Textile' }),
        profile({ articleId: 'AVD021', articleLabel: 'Casquette personnalisée', family: 'Textile' }),
        profile({ articleId: 'cv-std', articleLabel: 'Carte de visite standard', family: 'cartes' }),
        profile({ articleId: 'cv-fidelite', articleLabel: 'Carte de fidélité', family: 'Cartes' }),
        profile({ articleId: 'AVD012', articleLabel: 'Carte de fidélité standard', family: 'Cartes' }),
        profile({ articleId: 'fly-std', articleLabel: 'Flyer', family: 'Impression petit format' }),
        profile({ articleId: 'AVD017', articleLabel: 'Flyers 90x90 mm recto', family: 'Impression petit format' }),
        profile({ articleId: 'AVD018', articleLabel: 'Flyers 90x90 mm recto-verso', family: 'Impression petit format' }),
        profile({ articleId: 'fin-dorure', articleLabel: 'Dorure / argenture', family: 'Finitions & Reliures' }),
        profile({ articleId: 'fin-coins', articleLabel: 'Coins arrondis', family: 'Finitions & Reliures' }),
        profile({ articleId: 'fin-couture', articleLabel: 'Couture Oriflammes', family: 'Finitions & Reliures' }),
      ],
      {},
      'commercial',
      ctx,
    );

    const byId = Object.fromEntries(items.map((i) => [i.id, i.category]));
    // SKUs DirectSale fusionnés → pas de carte POS séparée
    expect(byId.AVD022).toBeUndefined();
    expect(byId.AVD021).toBeUndefined();
    expect(byId.AVD012).toBeUndefined();
    expect(byId.AVD017).toBeUndefined();
    expect(byId.AVD018).toBeUndefined();
    // Canoniques hors finitions
    expect(byId['tx-bob']).toBe('textile');
    expect(byId['tx-casquette']).toBe('textile');
    expect(byId['cv-std']).toBe('carterie');
    expect(byId['cv-fidelite']).toBe('carterie');
    expect(byId['fly-std']).toBe('flyers');
    expect(byId['fin-dorure']).toBe('finitions');
    expect(byId['fin-coins']).toBe('finitions');
    expect(byId['fin-couture']).toBe('finitions');

    const finitions = items.filter((i) => i.category === 'finitions');
    expect(finitions.every((i) => !/bob|casquette|carte de visite|fidélité|flyer/i.test(i.name))).toBe(true);
  });
});
