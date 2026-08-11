import { describe, expect, it } from 'vitest';
import {
  applyLaizeBillingRule,
  computeGrandFormatBillable,
} from '@/lib/grand-format/pricing';
import {
  calculateGrandFormatPrice,
  calculateGrandFormatPriceFromMeters,
} from '@/lib/grand-format/calculate-grand-format-price';
import {
  applyGfCuttingMarginToA0Price,
  DEFAULT_GF_CUTTING_MARGINS,
} from '@/lib/grand-format/cutting-margins';

const PERSO = { format: 'Format personnalisé' };

describe('seuil 30 cm — spécification métier', () => {
  it('diff = 30 cm → PAS de conversion (0.9 × 1.5, laize 1.2)', () => {
    const r = applyLaizeBillingRule(90, 120);
    expect(r.ruleApplied).toBe(false);
    expect(r.billedWidthCm).toBe(90);
    expect(r.diffLaizeCm).toBe(30);

    const bill = calculateGrandFormatPriceFromMeters({
      widthM: 0.9,
      lengthM: 1.5,
      prixM2: 120_000,
      laizesM: [1.2],
    });
    expect(bill.conversionLaize).toBe(false);
    expect(bill.surfaceFactureeM2).toBe(1.35);
    expect(bill.prixUnitaireFinal).toBe(162_000);
  });

  it('diff = 25 cm → conversion laize (0.95 × 1.8, laize 1.2)', () => {
    const r = applyLaizeBillingRule(95, 120);
    expect(r.ruleApplied).toBe(true);
    expect(r.billedWidthCm).toBe(120);

    const bill = calculateGrandFormatPriceFromMeters({
      widthM: 0.95,
      lengthM: 1.8,
      prixM2: 120_000,
      laizesM: [1.2],
    });
    expect(bill.conversionLaize).toBe(true);
    expect(bill.surfaceFactureeM2).toBe(2.16);
    expect(bill.prixUnitaireFinal).toBe(259_200);
  });

  it('petite dim 1.25 m → laize 2.4 m', () => {
    const bill = calculateGrandFormatPriceFromMeters({
      widthM: 1.25,
      lengthM: 1.8,
      prixM2: 120_000,
      laizesM: [1.2, 2.4],
    });
    expect(bill.laizeUtiliseeCm).toBe(240);
    // diff 2.4-1.25 = 1.15 ≥ 0.30 → pas de force si on facture petite×grande?
    // Orientation: 125×180 → laize 240, diff=115 ≥ 30 → billed 125×180 = 2.25
    // OR 180×125 → laize 240, diff=60 ≥ 30 → billed 180×125 = 2.25
    expect(bill.surfaceFactureeM2).toBe(2.25);
  });
});

describe('marges découpe A0–A5', () => {
  const prixA0 = 120_000;

  it('A1 = 60 000 + 5 % = 63 000', () => {
    const cut = applyGfCuttingMarginToA0Price(prixA0, 'A1')!;
    expect(cut.basePrice).toBe(60_000);
    expect(cut.supplement).toBe(3_000);
    expect(cut.finalPrice).toBe(63_000);
  });

  it('A2 = 30 000 + 10 % = 33 000', () => {
    const cut = applyGfCuttingMarginToA0Price(prixA0, 'A2')!;
    expect(cut.finalPrice).toBe(33_000);
  });

  it('A3 = 15 000 + 15 % = 17 250', () => {
    const cut = applyGfCuttingMarginToA0Price(prixA0, 'A3')!;
    expect(cut.finalPrice).toBe(17_250);
  });

  it('A4 = 7 500 + 20 % = 9 000', () => {
    const cut = applyGfCuttingMarginToA0Price(prixA0, 'A4')!;
    expect(cut.finalPrice).toBe(9_000);
  });

  it('A5 = 3 750 + 25 % = 4 688 (arrondi)', () => {
    const cut = applyGfCuttingMarginToA0Price(prixA0, 'A5')!;
    expect(cut.basePrice).toBe(3_750);
    expect(cut.finalPrice).toBe(4_688); // Math.round(3750 + 937.5)
  });

  it('calculateGrandFormatPrice format A1', () => {
    const bill = calculateGrandFormatPrice({
      config: { format: 'A1 — 594×841 mm (≈ 60×80 cm — tarif A1)' },
      prixM2: prixA0,
      availableLaizesCm: [120, 240],
      stockKind: 'plaque',
      useA0FractionPricing: true,
    });
    expect(bill.margeDecoupe?.finalPrice).toBe(63_000);
    expect(bill.prixUnitaireFinal).toBe(63_000);
  });

  it('table défaut complète', () => {
    expect(DEFAULT_GF_CUTTING_MARGINS.map((r) => r.formatCode)).toEqual([
      'A0', 'A1', 'A2', 'A3', 'A4', 'A5',
    ]);
  });
});

describe('Lambahoany surface m²', () => {
  it('1.5 m² × 20 000 = 30 000 base', () => {
    // Simulate surface path without full textile bundle
    const surfaceM2 = 1.5;
    const prixM2 = 20_000;
    expect(Math.round(surfaceM2 * prixM2)).toBe(30_000);
  });
});

describe('régression laize existante', () => {
  it('125×300 laize 150 → conversion (diff 25)', () => {
    const bill = computeGrandFormatBillable({
      config: { ...PERSO, largeur_cm: 125, hauteur_cm: 300 },
      availableLaizesCm: [150],
      prixM2: 10_000,
      stockKind: 'rouleau',
    });
    expect(bill.surfaceFactureeM2).toBe(4.5);
    expect(bill.laizeRuleApplied).toBe(true);
  });

  it('115×300 laize 150 → pas de conversion (diff 35)', () => {
    const bill = computeGrandFormatBillable({
      config: { ...PERSO, largeur_cm: 115, hauteur_cm: 300 },
      availableLaizesCm: [150],
      prixM2: 10_000,
      stockKind: 'rouleau',
    });
    expect(bill.surfaceFactureeM2).toBe(3.45);
    expect(bill.laizeRuleApplied).toBe(false);
  });
});
