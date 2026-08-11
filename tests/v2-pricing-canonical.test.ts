/**
 * V2-03 — Caractérisation moteur tarifaire + arrondi MGA + source POS.
 * Sans écriture DB.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { htToTtcMga, roundMga, ttcToHtMga } from '@/lib/pricing/mga-round';

const mocks = vi.hoisted(() => ({
  calculatePrice: vi.fn(),
}));

vi.mock('@/lib/pricing/calculate', () => ({
  calculatePrice: mocks.calculatePrice,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    baseMaterial: { findUnique: vi.fn() },
    directSaleArticle: { findFirst: vi.fn() },
  },
}));

import { calculateFinalPOSPrice } from '@/lib/pricing/pricing-resolver';

describe('V2-03 — roundMga / TVA Ariary', () => {
  it.each([
    [1000.4, 1000],
    [1000.5, 1001],
    [1000.6, 1001],
    [NaN, 0],
    [Infinity, 0],
  ])('roundMga(%j) → %i', (raw, expected) => {
    expect(roundMga(raw as number)).toBe(expected);
  });

  it('HT→TTC et TTC→HT cohérents à 20 %', () => {
    const ht = 10_000;
    const ttc = htToTtcMga(ht, 20);
    expect(ttc).toBe(12_000);
    expect(ttcToHtMga(ttc, 20)).toBe(10_000);
  });

  it('évite flottants silencieux sur TTC→HT', () => {
    // 10001 / 1.2 = 8334.166… → 8334
    expect(ttcToHtMga(10_001, 20)).toBe(8334);
  });
});

describe('V2-03 — calculateFinalPOSPrice lit snapshot.priceSource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('propage priceSource depuis snapshot (pas result.priceSource inexistant)', async () => {
    mocks.calculatePrice.mockResolvedValue({
      prixUnitaire: 2500,
      formulaApplied: 'prixBase',
      snapshot: { priceSource: 'dynamicPrixBase' },
    });

    const r = await calculateFinalPOSPrice('art-1', { qty: 1 });
    expect(r).not.toBeNull();
    expect(r!.prixUnitaire).toBe(2500);
    expect(r!.source).toBe('dynamicPrixBase');
    expect(r!.formula).toBe('prixBase');
  });

  it('fallback calculatePrice si snapshot sans source', async () => {
    mocks.calculatePrice.mockResolvedValue({
      prixUnitaire: 100,
      snapshot: {},
    });
    const r = await calculateFinalPOSPrice('art-2', {});
    expect(r!.source).toBe('calculatePrice');
  });

  it('null si calculatePrice null', async () => {
    mocks.calculatePrice.mockResolvedValue(null);
    expect(await calculateFinalPOSPrice('x', {})).toBeNull();
  });
});
