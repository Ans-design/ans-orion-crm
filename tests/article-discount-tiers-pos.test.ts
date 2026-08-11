import { describe, expect, it } from 'vitest';
import { pickAppliedDbTier, pickDbTierUnitPrice } from '@/lib/pricing/tier-price';

describe('pickAppliedDbTier percent mode', () => {
  const tiers = [
    { minQty: 1, maxQty: 10, unitPrice: null, discountPercent: 0, active: true },
    { minQty: 11, maxQty: 20, unitPrice: null, discountPercent: 5, active: true },
    { minQty: 21, maxQty: 30, unitPrice: null, discountPercent: 25, active: true },
  ];

  it('applique 5 % à qty 15 sur base 20000 → 19000', () => {
    const hit = pickAppliedDbTier(tiers, 15, 20_000);
    expect(hit?.discountPercent).toBe(5);
    expect(hit?.unitPrice).toBe(19_000);
    expect(pickDbTierUnitPrice(tiers, 15, 20_000)).toBe(19_000);
  });

  it('applique 25 % à qty 25 → 15000', () => {
    expect(pickDbTierUnitPrice(tiers, 25, 20_000)).toBe(15_000);
  });

  it('qty 5 sans remise → base', () => {
    expect(pickDbTierUnitPrice(tiers, 5, 20_000)).toBe(20_000);
  });
});
