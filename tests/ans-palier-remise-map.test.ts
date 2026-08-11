import { describe, expect, it } from 'vitest';
import {
  buildAnsPalierVariantKey,
  normalizeAnsPalierTiers,
  pickDiscountTiersForVariant,
  resolvePricingVariantKey,
} from '@/lib/pricing/ans-palier-remise-map';

describe('normalizeAnsPalierTiers', () => {
  it('enchaîne les paliers reliure standards', () => {
    const tiers = normalizeAnsPalierTiers([
      { min_piece: 1, max_piece: 9, remise_pct: 0 },
      { min_piece: 10, max_piece: 39, remise_pct: 10 },
      { min_piece: 40, max_piece: 79, remise_pct: 18 },
      { min_piece: 80, max_piece: 129, remise_pct: 25 },
      { min_piece: 130, max_piece: 200, remise_pct: 33 },
    ]);
    expect(tiers).toEqual([
      { minQty: 1, maxQty: 9, discountPercent: 0 },
      { minQty: 10, maxQty: 39, discountPercent: 10 },
      { minQty: 40, maxQty: 79, discountPercent: 18 },
      { minQty: 80, maxQty: 129, discountPercent: 25 },
      { minQty: 130, maxQty: 200, discountPercent: 33 },
    ]);
  });

  it('ignore le palier point promo Excel et garde les bandes volume PRIX 2026 (A4 bâche)', () => {
    // Excel : 1–16 @ 2200, 16 @ 1700 (bruit), 16–160 @ 1500, 160–400 @ 1300, 400+ @ 1200
    const tiers = normalizeAnsPalierTiers([
      { min_piece: 1, max_piece: 16, remise_pct: 0 },
      { min_piece: 16, max_piece: 16, remise_pct: 22.73 },
      { min_piece: 16, max_piece: 160, remise_pct: 31.82 },
      { min_piece: 160, max_piece: 400, remise_pct: 40.91 },
      { min_piece: 400, max_piece: '', remise_pct: 45.45 },
    ]);
    expect(tiers.map((t) => [t.minQty, t.maxQty, t.discountPercent])).toEqual([
      [1, 15, 0],
      [16, 159, 31.82],
      [160, 399, 40.91],
      [400, null, 45.45],
    ]);
  });

  it('conserve le prix catalogue point 0 % (A0 qty = 1) puis la bande volume', () => {
    const tiers = normalizeAnsPalierTiers([
      { min_piece: 1, max_piece: 1, remise_pct: 0 },
      { min_piece: 1, max_piece: 10, remise_pct: 15 },
      { min_piece: 10, max_piece: 25, remise_pct: 25 },
      { min_piece: 25, max_piece: '', remise_pct: 35 },
    ]);
    expect(tiers.map((t) => [t.minQty, t.maxQty, t.discountPercent])).toEqual([
      [1, 1, 0],
      [2, 9, 15],
      [10, 24, 25],
      [25, null, 35],
    ]);
  });
});

describe('buildAnsPalierVariantKey', () => {
  it('mappe formats GF', () => {
    expect(
      buildAnsPalierVariantKey({
        family: 'P P Indechirable grand format',
        articleId: 'gf-pp',
        variante: 'A4 · 20 x 30',
      }).variantKey,
    ).toBe('a4');
    expect(
      buildAnsPalierVariantKey({
        family: 'P P Indechirable grand format',
        articleId: 'gf-pp',
        variante: 'A0 =1 m2 · 120 x 80',
      }).variantKey,
    ).toBe('a0');
  });

  it('mappe flyers par famille', () => {
    expect(
      buildAnsPalierVariantKey({
        family: 'Flyers A6 (4 flyers par feuille A4)',
        articleId: 'fly-std',
        variante: 'Format fini',
      }).variantKey,
    ).toBe('flyer-a6');
  });

  it('mappe textile avec/sans support', () => {
    expect(
      buildAnsPalierVariantKey({
        family: 'T-Shirt 170 G',
        articleId: 'tx-tshirt',
        variante: 'T-Shirt 170g – Tailles S, M · zone A4',
      }).variantKey,
    ).toMatch(/^avec-support/);
    expect(
      buildAnsPalierVariantKey({
        family: 'T-Shirt 170 G · impression + presse seule',
        articleId: 'tx-tshirt',
        variante: 'Zone A4',
      }).variantKey,
    ).toMatch(/^sans-support/);
  });

  it('sépare bâche laize 180 (par format) et 240/320', () => {
    expect(
      buildAnsPalierVariantKey({
        family: 'Bache 180 cm',
        articleId: 'gf-bache',
        variante: 'A4 · 20 x 30',
      }).variantKey,
    ).toBe('180__a4');
    expect(
      buildAnsPalierVariantKey({
        family: 'Bache 180 cm',
        articleId: 'gf-bache',
        variante: 'A0 =1 m2 · 120 x 80',
      }).variantKey,
    ).toBe('180__a0');
    expect(
      buildAnsPalierVariantKey({
        family: 'Bache 240 et 320 cm& dos blanc',
        articleId: 'gf-bache',
        variante: 'A0 =1 m2 · 120 x 80',
      }).variantKey,
    ).toBe('240-320__a0');
  });
});

describe('resolvePricingVariantKey + pick', () => {
  it('résout format GF depuis config POS', () => {
    expect(resolvePricingVariantKey('gf-pp', { format: 'A3' })).toBe('a3');
    expect(resolvePricingVariantKey('fly-std', { format: 'A6' })).toBe('flyer-a6');
  });

  it('résout bâche selon laize POS', () => {
    expect(resolvePricingVariantKey('gf-bache', { format: 'A4', laize: '1m80' })).toBe('180__a4');
    expect(resolvePricingVariantKey('gf-bache', { format: 'A0', laize: '3m20' })).toBe('240-320__a0');
  });

  it('sélectionne la grille variante ou fallback défaut', () => {
    const tiers = [
      { variantKey: 'a4', minQty: 1 },
      { variantKey: 'a4', minQty: 17 },
      { variantKey: 'a0', minQty: 1 },
      { variantKey: '', minQty: 1 },
    ];
    expect(pickDiscountTiersForVariant(tiers, 'a0').every((t) => t.variantKey === 'a0')).toBe(true);
    expect(pickDiscountTiersForVariant(tiers, 'a1')[0]?.variantKey).toBe('');
  });
});
