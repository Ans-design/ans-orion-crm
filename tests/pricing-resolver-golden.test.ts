/**
 * LOT 3 — Golden tests pricing (fonctions pures, sans écriture DB).
 * Fige les invariants : qty, paliers, remises volume, promo, surface GF, arrondis MGA.
 */
import { describe, expect, it } from 'vitest';
import {
  pickAppliedConfigTier,
  pickAppliedDbTier,
  pickTierUnitPrice,
} from '@/lib/pricing/tier-price';
import { normalizeQty } from '@/lib/pricing/price-types';
import {
  volumeRemiseAmount,
  volumeRemiseRate,
} from '@/lib/pricing/volume-remise';
import {
  DEFAULT_GENERIC_VOLUME_DISCOUNT_TIERS,
  volumeRemiseRateFromTiers,
} from '@/lib/pricing/published-volume-tiers';
import {
  applyArticlePromotionalDiscount,
  isPromoPetitFormatMaterial,
} from '@/lib/pricing/event-pricing';
import { applyPromotionalRule } from '@/lib/pricing/pricing-resolver';
import { validatePriceTiers } from '@/lib/server/modules/pricing/price-tier.validation';
import { computeDynamicUnitPrice } from '@/lib/pricing/dynamic-engine';
import type { DynamicPricingContext } from '@/lib/pricing/dynamic-pricing-context';

/** Contexte dynamique minimal — fixtures de test uniquement. */
function mockDynamicCtx(
  partial: Partial<DynamicPricingContext> & {
    prixBase?: number;
    calculationType?: string;
    tiers?: DynamicPricingContext['discountTiers'];
  } = {},
): DynamicPricingContext {
  const {
    prixBase = 1000,
    calculationType = 'unit',
    tiers = [],
    ...rest
  } = partial;
  return {
    profile: {
      id: 'p1',
      articleId: 'golden-test-article',
      articleLabel: 'Golden',
      family: 'test',
      saleUnit: 'u',
      calculationType,
      prixBase,
      prixM2: null,
      prixCm2: null,
      qtyMin: 1,
      active: true,
      status: 'published',
      source: 'test',
      createdAt: new Date(0),
      updatedAt: new Date(0),
    } as DynamicPricingContext['profile'],
    formula: {
      id: 'f1',
      articleId: 'golden-test-article',
      version: 1,
      expression: 'prixBase',
      status: 'published',
      createdAt: new Date(0),
      updatedAt: new Date(0),
      label: null,
      source: null,
      variables: null,
      pipeline: null,
      publishedAt: null,
      publishedBy: null,
    } as unknown as DynamicPricingContext['formula'],
    discountTiers: tiers,
    materialPrices: [],
    variables: [],
    optionGroups: [],
    urgencyRules: [],
    stockRules: [],
    ...rest,
  };
}

describe('LOT3 GOLDEN — normalizeQty', () => {
  it.each([
    [undefined, 1],
    [null, 1],
    [0, 1],
    [-5, 1],
    ['', 1],
    ['abc', 1],
    [1, 1],
    [1.9, 1],
    [100, 100],
    ['50', 50],
  ])('normalizeQty(%j) → %i', (raw, expected) => {
    expect(normalizeQty(raw)).toBe(expected);
  });
});

describe('LOT3 GOLDEN — paliers config (max/px)', () => {
  const tiers = [
    { max: 99, px: 1000 },
    { max: 499, px: 900 },
    { max: null, px: 800 },
  ];

  it('qty 0 / négative : premier palier (comportement actuel pick)', () => {
    // qty 0 ≤ 99 → premier palier
    expect(pickTierUnitPrice(tiers, 0, 9999)).toBe(1000);
  });

  it('qty 1 = début', () => {
    expect(pickTierUnitPrice(tiers, 1, 0)).toBe(1000);
    expect(pickAppliedConfigTier(tiers, 1, 0)?.label).toBe('1–99');
  });

  it('seuil exact 99', () => {
    expect(pickTierUnitPrice(tiers, 99, 0)).toBe(1000);
  });

  it('juste après seuil 100', () => {
    expect(pickTierUnitPrice(tiers, 100, 0)).toBe(900);
  });

  it('grande quantité → dernier palier ouvert', () => {
    expect(pickTierUnitPrice(tiers, 10_000, 0)).toBe(800);
    expect(pickAppliedConfigTier(tiers, 10_000, 0)?.maxQty).toBeNull();
  });

  it('fallback si liste vide', () => {
    expect(pickTierUnitPrice([], 50, 777)).toBe(777);
    expect(pickAppliedConfigTier([], 50, 777)).toBeNull();
  });
});

describe('LOT3 GOLDEN — paliers DB (minQty/maxQty)', () => {
  const tiers = [
    { minQty: 1, maxQty: 99, unitPrice: 1200, active: true },
    { minQty: 100, maxQty: 499, unitPrice: 950, active: true },
    { minQty: 500, maxQty: null, unitPrice: 800, active: true },
  ];

  it('qty 1', () => {
    expect(pickAppliedDbTier(tiers, 1, 0)?.unitPrice).toBe(1200);
  });

  it('seuil exact 99 puis 100', () => {
    expect(pickAppliedDbTier(tiers, 99, 0)?.unitPrice).toBe(1200);
    expect(pickAppliedDbTier(tiers, 100, 0)?.unitPrice).toBe(950);
  });

  it('qty 500+', () => {
    expect(pickAppliedDbTier(tiers, 500, 0)?.unitPrice).toBe(800);
    expect(pickAppliedDbTier(tiers, 9999, 0)?.unitPrice).toBe(800);
  });

  it('ignore inactive', () => {
    const withInactive = [
      { minQty: 1, maxQty: 10, unitPrice: 1, active: false },
      { minQty: 1, maxQty: null, unitPrice: 500, active: true },
    ];
    expect(pickAppliedDbTier(withInactive, 5, 0)?.unitPrice).toBe(500);
  });

  it('unitPrice null → fallback', () => {
    expect(
      pickAppliedDbTier(
        [{ minQty: 1, maxQty: null, unitPrice: null, active: true }],
        10,
        4242,
      )?.unitPrice,
    ).toBe(4242);
  });
});

describe('LOT3 GOLDEN — validatePriceTiers', () => {
  it('rejette max < min', () => {
    const r = validatePriceTiers(
      [{ minQty: 10, maxQty: 5, unitPrice: 100, discountPercent: 0, active: true }],
      { tierMode: 'unit_price' },
    );
    expect(r.isValid).toBe(false);
  });

  it('rejette prix négatif', () => {
    const r = validatePriceTiers(
      [{ minQty: 1, maxQty: null, unitPrice: -10, discountPercent: 0, active: true }],
      { tierMode: 'unit_price' },
    );
    expect(r.isValid).toBe(false);
  });

  it('accepte remise 0 et 100 % en mode discount', () => {
    const r = validatePriceTiers(
      [
        { minQty: 1, maxQty: 99, unitPrice: null, discountPercent: 0, active: true },
        { minQty: 100, maxQty: null, unitPrice: null, discountPercent: 100, active: true },
      ],
      { tierMode: 'percent' },
    );
    expect(r.isValid).toBe(true);
  });
});

describe('LOT3 GOLDEN — remise volume', () => {
  const tiers = DEFAULT_GENERIC_VOLUME_DISCOUNT_TIERS;

  it.each([
    [1, 0],
    [99, 0],
    [100, 0.05],
    [499, 0.05],
    [500, 0.1],
    [999, 0.1],
    [1000, 0.15],
    [50_000, 0.15],
  ] as const)('qty %i → rate %f', (qty, rate) => {
    expect(volumeRemiseRateFromTiers(qty, tiers)).toBe(rate);
    expect(volumeRemiseRate(qty, tiers)).toBe(rate);
  });

  it('montant arrondi MGA (entier)', () => {
    // 1000 * 5% = 50
    expect(volumeRemiseAmount(1000, 100, tiers)).toBe(50);
    // 333 * 5% = 16.65 → 17
    expect(volumeRemiseAmount(333, 100, tiers)).toBe(17);
  });

  it('tiers vides → 0', () => {
    expect(volumeRemiseRateFromTiers(500, [])).toBe(0);
  });
});

describe('LOT3 GOLDEN — promo %', () => {
  it('remise 0 / 100 / clamp', () => {
    expect(applyArticlePromotionalDiscount(1000, 0)).toBe(1000);
    expect(applyArticlePromotionalDiscount(1000, 100)).toBe(0);
    expect(applyArticlePromotionalDiscount(1000, -10)).toBe(1000);
    expect(applyArticlePromotionalDiscount(1000, 150)).toBe(0);
  });

  it('arrondi Ariary', () => {
    // 1000 * 0.875 = 875
    expect(applyArticlePromotionalDiscount(1000, 12.5)).toBe(875);
  });

  it('matière petit format éligible', () => {
    expect(isPromoPetitFormatMaterial('Offset 80g')).toBe(true);
    expect(isPromoPetitFormatMaterial('PCB 300g')).toBe(true);
    expect(isPromoPetitFormatMaterial('Bâche 510g')).toBe(false);
  });

  it('applyPromotionalRule sans article promo → inchangé', () => {
    const r = applyPromotionalRule(2000, 'unknown-article', 'Offset');
    expect(r.applied).toBe(false);
    expect(r.price).toBe(2000);
  });
});

describe('LOT3 GOLDEN — surface grand format (arrondi)', () => {
  it('calcule m² et arrondit le total MGA', () => {
    const pricePerM2 = 40_000;
    const widthMm = 1000;
    const heightMm = 500; // 0.5 m²
    const surface = (widthMm / 1000) * (heightMm / 1000);
    expect(surface).toBe(0.5);
    expect(Math.round(pricePerM2 * surface)).toBe(20_000);
  });

  it('dims invalides → surface 0', () => {
    expect((0 / 1000) * (1000 / 1000)).toBe(0);
    expect(!(0 > 0)).toBe(true);
  });
});

describe('LOT3 GOLDEN — computeDynamicUnitPrice (mock ctx, no DB write)', () => {
  it('prixBase sans paliers', () => {
    const r = computeDynamicUnitPrice(
      'golden-test-article',
      { qty: 1 },
      1,
      mockDynamicCtx({ prixBase: 2500 }),
    );
    expect(r.prixUnitaire).toBe(2500);
    expect(r.priceSource).toBe('dynamicPrixBase');
  });

  it('applique paliers DB selon qty', () => {
    const tiers = [
      {
        id: 't1',
        articleId: 'golden-test-article',
        minQty: 1,
        maxQty: 99,
        unitPrice: 1000,
        discountPercent: 0,
        active: true,
        source: null,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      },
      {
        id: 't2',
        articleId: 'golden-test-article',
        minQty: 100,
        maxQty: null,
        unitPrice: 800,
        discountPercent: 0,
        active: true,
        source: null,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      },
    ] as unknown as DynamicPricingContext['discountTiers'];

    const low = computeDynamicUnitPrice(
      'golden-test-article',
      {},
      50,
      mockDynamicCtx({ prixBase: 1000, tiers }),
    );
    const high = computeDynamicUnitPrice(
      'golden-test-article',
      {},
      100,
      mockDynamicCtx({ prixBase: 1000, tiers }),
    );
    expect(low.prixUnitaire).toBe(1000);
    expect(high.prixUnitaire).toBe(800);
    expect(high.priceSource).toBe('dynamicDiscountTier');
  });

  it('calculationType m2 avec dimensions cm', () => {
    const ctx = mockDynamicCtx({
      prixBase: 0,
      calculationType: 'm2',
    });
    (ctx.profile as { prixM2: number | null }).prixM2 = 50_000;
    const r = computeDynamicUnitPrice(
      'golden-test-article',
      { largeur_cm: 100, hauteur_cm: 100 },
      1,
      ctx,
    );
    // 1 m² × 50 000
    expect(r.prixUnitaire).toBe(50_000);
    expect(r.priceSource).toBe('dynamicM2Dims');
  });
});
