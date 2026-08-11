import { describe, expect, it } from 'vitest';
import {
  calculatePackagingBoxPrice,
  calculatePackagingSurface,
} from '@/lib/packaging/packaging-box-price';
import { SURFACE_A4_M2 } from '@/lib/packaging/packaging-a4-equivalence';

describe('calculatePackagingBoxPrice', () => {
  it('cas acceptation métier → 50 400 Ar (PCB 300g, A0, pelliculage)', () => {
    const r = calculatePackagingBoxPrice({
      longueur: 100,
      profondeur: 50,
      hauteur: 80,
      matiere: 'PCB',
      grammage: '300g',
      formatEquivalent: 'A0',
      finitions: ['Pelliculage mat'],
      qty: 1,
      prixA4Impression: 1500,
      pelliculageA4: 600,
      beneficePct: 30,
      margeDepensePct: 10,
      margeDechetsPct: 10,
    });

    expect(r.calculable).toBe(true);
    expect(r.equivA4).toBe(16);
    expect(r.formatEquivalent).toBe('A0');
    expect(r.prixImpressionBrut).toBe(24_000); // 1500 × 16
    expect(r.prixDechetsMatiere).toBe(2_400); // 10 %
    expect(r.prixImpressionAvecDechets).toBe(26_400);
    expect(r.prixFinitions).toBe(9_600); // 600 × 16
    expect(r.sousTotalDepenses).toBe(36_000);
    expect(r.benefice).toBe(10_800);
    expect(r.margeDepense).toBe(3_600);
    expect(r.prixUnitaire).toBe(50_400);
  });

  it('sans finition → dépenses = impression + déchets seulement', () => {
    const r = calculatePackagingBoxPrice({
      formatEquivalent: 'A0',
      matiere: 'PCB',
      grammage: '300g',
      finitions: [],
      qty: 1,
      prixA4Impression: 1500,
      margeDechetsPct: 10,
      beneficePct: 30,
      margeDepensePct: 10,
    });
    expect(r.calculable).toBe(true);
    expect(r.prixFinitions).toBe(0);
    expect(r.sousTotalDepenses).toBe(26_400);
    expect(r.prixUnitaire).toBe(36_960); // 26400 × 1.4
  });

  it('double finition (pelliculage + gaufrage)', () => {
    const r = calculatePackagingBoxPrice({
      formatEquivalent: 'A4',
      matiere: 'PCB',
      grammage: '300g',
      finitions: ['Pelliculage brillant', 'Gaufrage'],
      qty: 1,
      prixA4Impression: 1000,
      pelliculageA4: 500,
      gaufrageA4: 800,
      margeDechetsPct: 10,
      beneficePct: 30,
      margeDepensePct: 10,
    });
    expect(r.equivA4).toBe(1);
    expect(r.prixImpressionBrut).toBe(1000);
    expect(r.prixDechetsMatiere).toBe(100);
    expect(r.prixFinitions).toBe(1_300); // 500 + 800
    expect(r.sousTotalDepenses).toBe(2_400);
    expect(r.prixUnitaire).toBe(3_360);
  });

  it('surface L×P×H Auto → équiv A4 > 0', () => {
    const surf = calculatePackagingSurface({
      longueur: 200,
      profondeur: 100,
      hauteur: 80,
      structure: 'Boîte rabats droits',
      margeDechetsPct: 10,
    });
    expect(surf.surfaceTheoriqueM2).toBeGreaterThan(0);
    expect(surf.surfaceAvecDechetsM2).toBeCloseTo(
      surf.surfaceTheoriqueM2 * 1.1,
      6,
    );

    const r = calculatePackagingBoxPrice({
      longueur: 200,
      profondeur: 100,
      hauteur: 80,
      structure: 'Boîte rabats droits',
      matiere: 'PCB',
      grammage: '300g',
      formatEquivalent: 'Auto',
      finitions: [],
      qty: 1,
      prixA4Impression: 1000,
      margeDechetsPct: 10,
      beneficePct: 30,
      margeDepensePct: 10,
    });
    expect(r.calculable).toBe(true);
    expect(r.equivA4).toBeGreaterThan(0);
    expect(r.equivA4).toBeCloseTo(surf.surfaceAvecDechetsM2 / SURFACE_A4_M2, 1);
    expect(r.prixUnitaire).toBeGreaterThan(0);
  });

  it('dims manquantes sans format forcé → non calculable', () => {
    const r = calculatePackagingBoxPrice({
      longueur: 0,
      profondeur: 0,
      hauteur: 0,
      formatEquivalent: 'Auto',
      prixA4Impression: 1500,
    });
    expect(r.calculable).toBe(false);
    expect(r.surDevis).toBe(true);
  });
});
