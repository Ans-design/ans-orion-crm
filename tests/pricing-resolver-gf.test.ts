import { describe, expect, it, vi, beforeEach } from 'vitest';

const calculateGrandFormatPrice = vi.fn();

vi.mock('@/lib/grand-format/calculate-grand-format-price', () => ({
  calculateGrandFormatPrice: (...args: unknown[]) => calculateGrandFormatPrice(...args),
}));

vi.mock('@/lib/pricing/material-context-price', () => ({
  getMaterialBasePrice: vi.fn().mockResolvedValue({
    priceHT: 20000,
    materialKey: 'vinyle-blanc',
    source: 'materialContextPrice',
  }),
}));

vi.mock('@/lib/pricing/material-format-limits', () => ({
  isFormatAllowedForMaterial: vi.fn().mockReturnValue({ allowed: true }),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    baseMaterial: { findFirst: vi.fn().mockResolvedValue(null) },
    stockItem: { findMany: vi.fn().mockResolvedValue([]) },
    stockRule: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

import { resolveGrandFormatPrice } from '@/lib/pricing/pricing-resolver';

describe('resolveGrandFormatPrice', () => {
  beforeEach(() => {
    calculateGrandFormatPrice.mockReset();
    calculateGrandFormatPrice.mockReturnValue({
      calculable: true,
      surDevis: false,
      prixUnitaireFinal: 36000,
      surfaceFactureeM2: 1.8,
      laizeUtiliseeCm: 150,
    });
  });

  it('délègue au moteur laize/surface (plus de mm² naïf)', async () => {
    const r = await resolveGrandFormatPrice('vinyle-blanc', 1200, 1500, undefined, {
      availableLaizesCm: [100, 150],
    });
    expect(calculateGrandFormatPrice).toHaveBeenCalled();
    const arg = calculateGrandFormatPrice.mock.calls[0]![0] as {
      config: { largeur_cm: number; hauteur_cm: number };
      prixM2: number;
      useA0FractionPricing: boolean;
    };
    expect(arg.config.largeur_cm).toBe(120);
    expect(arg.config.hauteur_cm).toBe(150);
    expect(arg.prixM2).toBe(20000);
    expect(arg.useA0FractionPricing).toBe(false);
    expect(r?.prixUnitaire).toBe(36000);
    expect(r?.source).toContain('laizeSurface');
    expect(r?.surDevis).toBeFalsy();
  });

  it('propage surDevis si le moteur ne chiffre pas', async () => {
    calculateGrandFormatPrice.mockReturnValue({
      calculable: false,
      surDevis: true,
      prixUnitaireFinal: 0,
      surfaceFactureeM2: 0,
      laizeUtiliseeCm: null,
    });
    const r = await resolveGrandFormatPrice('vinyle-blanc', 1200, 1500);
    expect(r?.surDevis).toBe(true);
    expect(r?.prixUnitaire).toBe(0);
  });
});
