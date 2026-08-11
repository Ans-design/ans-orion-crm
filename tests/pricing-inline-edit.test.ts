import { describe, expect, it } from 'vitest';
import { normalizeOptionFlags, validateDiscountTiers } from '@/lib/pricing/validate-discount-tiers';

describe('validateDiscountTiers', () => {
  it('accepts valid non-overlapping tiers', () => {
    expect(validateDiscountTiers([
      { minQty: 1, maxQty: 10, unitPrice: 100, discountPercent: 0 },
      { minQty: 11, maxQty: null, unitPrice: 80, discountPercent: 0 },
    ])).toBeNull();
  });

  it('rejects overlapping tiers', () => {
    expect(validateDiscountTiers([
      { minQty: 1, maxQty: 50, unitPrice: 100, discountPercent: 0 },
      { minQty: 40, maxQty: null, unitPrice: 80, discountPercent: 0 },
    ])).toMatch(/Chevauchement/);
  });

  it('rejects quantity gaps between tiers', () => {
    expect(validateDiscountTiers([
      { minQty: 1, maxQty: 10, unitPrice: 100, discountPercent: 0 },
      { minQty: 20, maxQty: null, unitPrice: 80, discountPercent: 0 },
    ])).toMatch(/Trou de quantité/);
  });

  it('rejects duplicate minQty', () => {
    expect(validateDiscountTiers([
      { minQty: 1, maxQty: 10, unitPrice: 100, discountPercent: 0 },
      { minQty: 1, maxQty: 20, unitPrice: 80, discountPercent: 0 },
    ])).toMatch(/dupliqu/);
  });

  it('rejects max < min', () => {
    expect(validateDiscountTiers([
      { minQty: 10, maxQty: 5, unitPrice: 100, discountPercent: 0 },
    ])).toMatch(/max < min/);
  });
});

describe('normalizeOptionFlags', () => {
  it('impact prix disables indicatif', () => {
    expect(normalizeOptionFlags({ impactsPrice: true, isInformational: true })).toEqual({
      impactsPrice: true,
      isInformational: false,
    });
  });

  it('indicatif disables impact prix', () => {
    expect(normalizeOptionFlags({ impactsPrice: true, isInformational: true })).toEqual({
      impactsPrice: true,
      isInformational: false,
    });
    expect(normalizeOptionFlags({ isInformational: true })).toEqual({
      impactsPrice: false,
      isInformational: true,
    });
  });
});
