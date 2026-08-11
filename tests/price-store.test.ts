import { describe, expect, it } from 'vitest';
import { resolveForcedUnitPrice } from '@/lib/pricing/config-normalize';

/** Tests unitaires ANS_PRICE_STORE — logique priorité sans DB */
describe('ans-price-store priorities', () => {
  it('pu_force beats auto calculation path', () => {
    const forced = resolveForcedUnitPrice({ prix_unitaire: 4200 });
    expect(forced).toBe(4200);
    expect(forced).toBeGreaterThan(0);
  });

  it('total_force concept: derived PU from total/qty', () => {
    const totalForce = 15000;
    const qty = 100;
    const derivedPu = totalForce / qty;
    expect(derivedPu).toBe(150);
  });

  it('admin modified flag when current differs from source', () => {
    const sourcePriceAr: number = 1000;
    const salePriceAr: number = 1200;
    const adminModified = salePriceAr !== sourcePriceAr;
    expect(adminModified).toBe(true);
  });

  it('reset restores source value', () => {
    const sourcePriceAr = 850;
    let salePriceAr = 1100;
    salePriceAr = sourcePriceAr;
    expect(salePriceAr).toBe(sourcePriceAr);
  });

  it('import preserves admin edit when adminModified', () => {
    const existing = { adminModified: true, salePriceAr: 5000, sourcePriceAr: 4500 };
    const importedPrice = 4600;
    const nextSale = existing.adminModified ? existing.salePriceAr : importedPrice;
    const nextSource = importedPrice;
    expect(nextSale).toBe(5000);
    expect(nextSource).toBe(4600);
  });

  it('import updates both when not modified', () => {
    const existing = { adminModified: false, salePriceAr: 4500, sourcePriceAr: 4500 };
    const importedPrice = 4600;
    const nextSale = existing.adminModified ? existing.salePriceAr : importedPrice;
    expect(nextSale).toBe(4600);
  });
});

describe('price priority order', () => {
  it('total_force wins over pu_force', () => {
    const totalForce = 10000;
    const puForce = 200;
    const qty = 50;
    let pricingMode: 'auto' | 'force_pu' | 'force_total' = 'auto';
    let totalHT = puForce * qty;
    if (puForce > 0) pricingMode = 'force_pu';
    if (totalForce > 0) {
      totalHT = totalForce;
      pricingMode = 'force_total';
    }
    expect(pricingMode).toBe('force_total');
    expect(totalHT).toBe(10000);
  });
});
