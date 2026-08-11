import { describe, expect, it } from 'vitest';
import {
  applyLaizeBillingRule,
  computeGrandFormatBillable,
  computeLaizeOrientedBilling,
  findExactLaizeMatch,
  pickLaizeCm,
} from '@/lib/grand-format/pricing';
import { calculateGrandFormatPrice } from '@/lib/grand-format/calculate-grand-format-price';
import { parseLaizeLabelToCm } from '@/lib/grand-format/laize-utils';

const PERSO = { format: 'Format personnalisé' };

describe('grand-format laize utils', () => {
  it('parse 1m50 to 150cm', () => {
    expect(parseLaizeLabelToCm('1m50')).toBe(150);
    expect(parseLaizeLabelToCm('1m20')).toBe(120);
  });

  it('tolérance exacte ±0,5 cm', () => {
    expect(findExactLaizeMatch(150.4, [120, 150, 160])).toBe(150);
    expect(findExactLaizeMatch(149.6, [120, 150, 160])).toBe(150);
    expect(findExactLaizeMatch(149.4, [120, 150, 160])).toBeNull();
  });
});

describe('grand-format 30cm laize rule — vinyle 150cm seul', () => {
  const laizes = [150];

  it('125×300 facture 150×300 (4.50 m²)', () => {
    const bill = computeGrandFormatBillable({
      config: { ...PERSO, largeur_cm: 125, hauteur_cm: 300 },
      availableLaizesCm: laizes,
      prixM2: 10000,
      stockKind: 'rouleau',
    });
    expect(bill.surfaceFactureeM2).toBe(4.5);
    expect(bill.laizeRuleApplied).toBe(true);
    expect(bill.laizeExactMatch).toBe(false);
    expect(bill.prixUnitaire).toBe(45000);
  });

  it('300×125 même prix que 125×300', () => {
    const a = computeGrandFormatBillable({
      config: { ...PERSO, largeur_cm: 125, hauteur_cm: 300 },
      availableLaizesCm: laizes,
      prixM2: 10000,
      stockKind: 'rouleau',
    });
    const b = computeGrandFormatBillable({
      config: { ...PERSO, largeur_cm: 300, hauteur_cm: 125 },
      availableLaizesCm: laizes,
      prixM2: 10000,
      stockKind: 'rouleau',
    });
    expect(b.surfaceFactureeM2).toBe(a.surfaceFactureeM2);
    expect(b.prixUnitaire).toBe(a.prixUnitaire);
  });

  it('115×300 facture 115×300 (3.45 m²)', () => {
    const bill = computeGrandFormatBillable({
      config: { ...PERSO, largeur_cm: 115, hauteur_cm: 300 },
      availableLaizesCm: laizes,
      prixM2: 10000,
      stockKind: 'rouleau',
    });
    expect(bill.surfaceFactureeM2).toBe(3.45);
    expect(bill.laizeRuleApplied).toBe(false);
    expect(bill.prixUnitaire).toBe(34500);
  });
});

describe('priorité correspondance exacte laize', () => {
  it('Cas 1 — 150×300 avec 120/150/160 → laize 150 exacte, pas 160', () => {
    const bill = computeGrandFormatBillable({
      config: { ...PERSO, largeur_cm: 150, hauteur_cm: 300 },
      availableLaizesCm: [120, 150, 160],
      prixM2: 10000,
      stockKind: 'rouleau',
    });
    expect(bill.laizeUtiliseeCm).toBe(150);
    expect(bill.laizeExactMatch).toBe(true);
    expect(bill.laizeRuleApplied).toBe(false);
    expect(bill.surfaceFactureeM2).toBe(4.5);
  });

  it('Cas 2 — 120×300 avec 120/150 → laize 120 exacte', () => {
    const bill = computeGrandFormatBillable({
      config: { ...PERSO, largeur_cm: 120, hauteur_cm: 300 },
      availableLaizesCm: [120, 150],
      prixM2: 10000,
      stockKind: 'rouleau',
    });
    expect(bill.laizeUtiliseeCm).toBe(120);
    expect(bill.laizeExactMatch).toBe(true);
    expect(bill.laizeRuleApplied).toBe(false);
    expect(bill.surfaceFactureeM2).toBe(3.6);
  });

  it('300×150 utilise laize 150 (correspondance sur hauteur)', () => {
    const bill = computeGrandFormatBillable({
      config: { ...PERSO, largeur_cm: 300, hauteur_cm: 150 },
      availableLaizesCm: [120, 150, 160],
      prixM2: 10000,
      stockKind: 'rouleau',
    });
    expect(bill.laizeUtiliseeCm).toBe(150);
    expect(bill.laizeExactMatch).toBe(true);
    expect(bill.surfaceFactureeM2).toBe(4.5);
  });
});

describe('anti-gaspillage + règle -30 cm', () => {
  it('Cas 3 — 115×300 avec 120/150 → laize 120, règle -30 appliquée', () => {
    const bill = computeGrandFormatBillable({
      config: { ...PERSO, largeur_cm: 115, hauteur_cm: 300 },
      availableLaizesCm: [120, 150],
      prixM2: 10000,
      stockKind: 'rouleau',
    });
    expect(bill.laizeUtiliseeCm).toBe(120);
    expect(bill.laizeExactMatch).toBe(false);
    expect(bill.laizeRuleApplied).toBe(true);
    expect(bill.surfaceFactureeM2).toBe(3.6);
  });

  it('Cas 4 — 115×300 laize 150 seule → pas d’arrondi -30', () => {
    const bill = computeGrandFormatBillable({
      config: { ...PERSO, largeur_cm: 115, hauteur_cm: 300 },
      availableLaizesCm: [150],
      prixM2: 10000,
      stockKind: 'rouleau',
    });
    expect(bill.laizeUtiliseeCm).toBe(150);
    expect(bill.laizeRuleApplied).toBe(false);
    expect(bill.surfaceFactureeM2).toBe(3.45);
  });

  it('Cas 5 — 125×300 laize 150 seule → arrondi -30 à 150', () => {
    const bill = computeGrandFormatBillable({
      config: { ...PERSO, largeur_cm: 125, hauteur_cm: 300 },
      availableLaizesCm: [150],
      prixM2: 10000,
      stockKind: 'rouleau',
    });
    expect(bill.laizeUtiliseeCm).toBe(150);
    expect(bill.laizeRuleApplied).toBe(true);
    expect(bill.surfaceFactureeM2).toBe(4.5);
  });

  it('115×300 sans laize 120 disponible (rupture) → 150 seule', () => {
    const bill = computeGrandFormatBillable({
      config: { ...PERSO, largeur_cm: 115, hauteur_cm: 300 },
      availableLaizesCm: [150],
      prixM2: 10000,
      stockKind: 'rouleau',
    });
    expect(bill.surfaceFactureeM2).toBe(3.45);
  });

  it('115×115 avec 120/240 → 120×115 (une seule dimension arrondie)', () => {
    const bill = computeGrandFormatBillable({
      config: { ...PERSO, largeur_cm: 115, hauteur_cm: 115 },
      availableLaizesCm: [120, 240],
      prixM2: 10000,
      stockKind: 'rouleau',
    });
    expect(bill.laizeUtiliseeCm).toBe(120);
    expect(bill.laizeRuleApplied).toBe(true);
    expect(bill.largeurFactureeCm).toBe(120);
    expect(bill.longueurFactureeCm).toBe(115);
    expect(bill.surfaceReelleM2).toBe(1.3225);
    expect(bill.surfaceFactureeM2).toBe(1.38);
    expect(bill.prixUnitaire).toBe(13800);
  });

  it('85×300 laize 120 → pas de règle -30 (85 < 90)', () => {
    const bill = computeGrandFormatBillable({
      config: { ...PERSO, largeur_cm: 85, hauteur_cm: 300 },
      availableLaizesCm: [120],
      prixM2: 10000,
      stockKind: 'rouleau',
    });
    expect(bill.laizeRuleApplied).toBe(false);
    expect(bill.largeurFactureeCm).toBe(85);
    expect(bill.longueurFactureeCm).toBe(300);
    expect(bill.surfaceFactureeM2).toBe(2.55);
  });

  it('200×115 → plus petite laize dans −30 cm (115→120) facturé 120×200', () => {
    const plan = computeLaizeOrientedBilling(200, 115, [120, 240]);
    expect(plan.laizeUtiliseeCm).toBe(120);
    expect(plan.largeurFactureeCm).toBe(120);
    expect(plan.longueurFactureeCm).toBe(200);
    expect(plan.surfaceFactureeM2).toBe(2.4);
  });

  it('90×300 → laize 1m facturé 100×300 (pas 320×90)', () => {
    const plan = computeLaizeOrientedBilling(90, 300, [100, 140, 160, 180, 240, 320]);
    expect(plan.laizeUtiliseeCm).toBe(100);
    expect(plan.largeurFactureeCm).toBe(100);
    expect(plan.longueurFactureeCm).toBe(300);
    expect(plan.surfaceFactureeM2).toBe(3);
  });

  it('300×90 même résultat (orientation symétrique)', () => {
    const plan = computeLaizeOrientedBilling(300, 90, [100, 140, 160, 180, 240, 320]);
    expect(plan.laizeUtiliseeCm).toBe(100);
    expect(plan.largeurFactureeCm).toBe(100);
    expect(plan.longueurFactureeCm).toBe(300);
    expect(plan.surfaceFactureeM2).toBe(3);
  });

  it('270×300 → laize 3m20 facturé 320×270 (pas 320×320)', () => {
    const plan = computeLaizeOrientedBilling(270, 300, [100, 140, 160, 180, 240, 320]);
    expect(plan.laizeUtiliseeCm).toBe(320);
    expect(plan.largeurFactureeCm).toBe(320);
    expect(plan.longueurFactureeCm).toBe(270);
    expect(plan.surfaceFactureeM2).toBe(8.64);
  });

  it('300×270 même résultat (orientation symétrique)', () => {
    const plan = computeLaizeOrientedBilling(300, 270, [100, 140, 160, 180, 240, 320]);
    expect(plan.laizeUtiliseeCm).toBe(320);
    expect(plan.largeurFactureeCm).toBe(320);
    expect(plan.longueurFactureeCm).toBe(270);
    expect(plan.surfaceFactureeM2).toBe(8.64);
  });
});

describe('computeLaizeOrientedBilling', () => {
  it('pickLaizeCm choisit la plus petite laize couvrante', () => {
    expect(pickLaizeCm(115, [120, 150]).laizeCm).toBe(120);
    expect(pickLaizeCm(125, [120, 150]).laizeCm).toBe(150);
  });

  it('applyLaizeBillingRule 115 sur laize 120', () => {
    const bill = applyLaizeBillingRule(115, 120);
    expect(bill.billedWidthCm).toBe(120);
    expect(bill.ruleApplied).toBe(true);
  });

  it('150×300 ne déclenche pas -30 vers 160 si 150 exact', () => {
    const plan = computeLaizeOrientedBilling(150, 300, [120, 150, 160]);
    expect(plan.laizeUtiliseeCm).toBe(150);
    expect(plan.laizeExactMatch).toBe(true);
    expect(plan.laizeRuleApplied).toBe(false);
    expect(plan.surfaceFactureeM2).toBe(4.5);
  });

  it('116×117 avec laize 120 → 120×116 (orientation la moins chère)', () => {
    const plan = computeLaizeOrientedBilling(116, 117, [120, 240]);
    expect(plan.laizeUtiliseeCm).toBe(120);
    expect(plan.largeurFactureeCm).toBe(120);
    expect(plan.longueurFactureeCm).toBe(116);
    expect(plan.laizeRuleApplied).toBe(true);
    expect(plan.surfaceReelleM2).toBe(1.3572);
    expect(plan.surfaceFactureeM2).toBe(1.392);
  });

  it('116×117 via computeGrandFormatBillable', () => {
    const bill = computeGrandFormatBillable({
      config: { ...PERSO, largeur_cm: 116, hauteur_cm: 117 },
      availableLaizesCm: [120, 240],
      prixM2: 10000,
      stockKind: 'rouleau',
    });
    expect(bill.largeurFactureeCm).toBe(120);
    expect(bill.longueurFactureeCm).toBe(116);
    expect(bill.surfaceFactureeM2).toBe(1.392);
    expect(bill.prixUnitaire).toBe(13920);
  });

  it('150×300 et 300×150 même prix (orientation équivalente)', () => {
    const a = computeGrandFormatBillable({
      config: { ...PERSO, largeur_cm: 125, hauteur_cm: 300 },
      availableLaizesCm: [150],
      prixM2: 10000,
      stockKind: 'rouleau',
    });
    const b = computeGrandFormatBillable({
      config: { ...PERSO, largeur_cm: 300, hauteur_cm: 125 },
      availableLaizesCm: [150],
      prixM2: 10000,
      stockKind: 'rouleau',
    });
    expect(b.prixUnitaire).toBe(a.prixUnitaire);
  });
});

describe('formats ISO A0–A4 — hors laize', () => {
  it('A4 ignore laize même si chip présent (surface réelle)', () => {
    const withLaize = computeGrandFormatBillable({
      config: { format: 'A4', laize: '150 cm' },
      availableLaizesCm: [120, 150],
      prixM2: 16000,
      stockKind: 'rouleau',
    });
    const withoutLaize = computeGrandFormatBillable({
      config: { format: 'A4' },
      availableLaizesCm: [120, 150],
      prixM2: 16000,
      stockKind: 'rouleau',
    });
    expect(withLaize.laizeRuleApplied).toBe(false);
    expect(withLaize.laizeUtiliseeCm).toBeNull();
    expect(withLaize.surfaceFactureeM2).toBe(withoutLaize.surfaceFactureeM2);
    expect(withLaize.prixUnitaire).toBe(withoutLaize.prixUnitaire);
    // A4 ≈ 21 × 29.7 cm = 0.06237 m²
    expect(withoutLaize.surfaceFactureeM2).toBeCloseTo(0.0624, 3);
  });

  it('A0 × ratio ignore laize (calculateGrandFormatPrice)', () => {
    const bill = calculateGrandFormatPrice({
      config: { format: 'A1', laize: '150 cm' },
      availableLaizesCm: [100, 150],
      prixM2: 40_000,
      stockKind: 'rouleau',
      useA0FractionPricing: true,
    });
    expect(bill.conversionLaize).toBe(false);
    expect(bill.laizeUtiliseeCm).toBeNull();
    expect(bill.laizeRuleApplied).toBe(false);
    // A1 = A0/2 + 5 % = 20000 + 1000 = 21000
    expect(bill.prixUnitaireFinal).toBe(21_000);
  });
});
