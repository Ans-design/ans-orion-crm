import { describe, expect, it } from 'vitest';
import { validatePriceTiers } from '@/lib/server/modules/pricing/price-tier.validation';
import { chainDiscountTierMins, validateDiscountTiers } from '@/lib/pricing/validate-discount-tiers';

describe('validatePriceTiers', () => {
  it('détecte le chevauchement', () => {
    const r = validatePriceTiers([
      { minQty: 1, maxQty: 100, unitPrice: 500, discountPercent: 0, active: true },
      { minQty: 50, maxQty: null, unitPrice: 400, discountPercent: 0, active: true },
    ], { tierMode: 'unit_price' });
    expect(r.isValid).toBe(false);
    expect(r.errors.some((e) => e.includes('Chevauchement'))).toBe(true);
  });

  it('valide des paliers continus', () => {
    const r = validatePriceTiers([
      { minQty: 50, maxQty: 99, unitPrice: 1200, discountPercent: 0, active: true },
      { minQty: 100, maxQty: 499, unitPrice: 950, discountPercent: 0, active: true },
      { minQty: 500, maxQty: null, unitPrice: 800, discountPercent: 0, active: true },
    ], { tierMode: 'unit_price', qtyMin: 50 });
    expect(r.isValid).toBe(true);
  });
});

describe('chainDiscountTierMins', () => {
  it('propage max+1 vers les min suivants', () => {
    const chained = chainDiscountTierMins([
      { minQty: 1, maxQty: 5, discountPercent: 0 },
      { minQty: 2, maxQty: 20, discountPercent: 5 },
      { minQty: 99, maxQty: null, discountPercent: 10 },
    ]);
    expect(chained[0]!.minQty).toBe(1);
    expect(chained[1]!.minQty).toBe(6);
    expect(chained[2]!.minQty).toBe(21);
    expect(validateDiscountTiers(chained.map((t) => ({ ...t, unitPrice: null, active: true })))).toBeNull();
  });

  it('vide un max devenu invalide après enchaînement', () => {
    const chained = chainDiscountTierMins([
      { minQty: 1, maxQty: 50, discountPercent: 0 },
      { minQty: 10, maxQty: 40, discountPercent: 5 },
    ]);
    expect(chained[1]!.minQty).toBe(51);
    expect(chained[1]!.maxQty).toBeNull();
  });

  it('conserve le max en cours de saisie même si temporairement < min', () => {
    const chained = chainDiscountTierMins(
      [
        { minQty: 1, maxQty: 100, discountPercent: 0 },
        { minQty: 101, maxQty: 5, discountPercent: 5 },
      ],
      { protectMaxIndex: 1 },
    );
    expect(chained[1]!.minQty).toBe(101);
    expect(chained[1]!.maxQty).toBe(5);
  });
});
