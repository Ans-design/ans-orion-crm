import { describe, expect, it } from 'vitest';
import {
  calculatePaperBagPrice,
  calculatePaperBagSurface,
  parsePaperBagFormatDims,
} from '@/lib/packaging/paper-bag-price';

describe('calculatePaperBagPrice', () => {
  it('cas acceptation → 50 400 Ar (PCB 300g, A0, pelliculage)', () => {
    const r = calculatePaperBagPrice({
      longueur: 250,
      profondeur: 100,
      hauteur: 300,
      matiere: 'PCB',
      grammage: '300g',
      formatEquivalent: 'A0',
      finitions: ['Pelliculage mat'],
      poignees: 'Sans poignée',
      qty: 1,
      prixA4Impression: 1500,
      pelliculageA4: 600,
      beneficePct: 30,
      margeDepensePct: 10,
      margeDechetsPct: 10,
    });
    expect(r.calculable).toBe(true);
    expect(r.equivA4).toBe(16);
    expect(r.prixImpressionBrut).toBe(24_000);
    expect(r.prixDechetsMatiere).toBe(2_400);
    expect(r.prixImpressionAvecDechets).toBe(26_400);
    expect(r.prixFinitions).toBe(9_600);
    expect(r.prixAccessoires).toBe(0);
    expect(r.sousTotalDepenses).toBe(36_000);
    expect(r.prixUnitaire).toBe(50_400);
  });

  it('sans finition → impression + déchets seulement', () => {
    const r = calculatePaperBagPrice({
      formatEquivalent: 'A0',
      matiere: 'PCB',
      grammage: '300g',
      finitions: [],
      poignees: 'Sans poignée',
      qty: 1,
      prixA4Impression: 1500,
      margeDechetsPct: 10,
      beneficePct: 30,
      margeDepensePct: 10,
    });
    expect(r.sousTotalDepenses).toBe(26_400);
    expect(r.prixUnitaire).toBe(36_960);
  });

  it('double finition + poignée cordelette', () => {
    const r = calculatePaperBagPrice({
      formatEquivalent: 'A4',
      matiere: 'PCB',
      grammage: '300g',
      finitions: ['Pelliculage brillant', 'Gaufrage'],
      poignees: 'Poignée cordelette',
      qty: 1,
      prixA4Impression: 1000,
      pelliculageA4: 500,
      gaufrageA4: 800,
      margeDechetsPct: 10,
      beneficePct: 30,
      margeDepensePct: 10,
    });
    expect(r.prixImpressionBrut).toBe(1000);
    expect(r.prixDechetsMatiere).toBe(100);
    expect(r.prixFinitions).toBe(1_300);
    expect(r.prixAccessoires).toBe(200);
    expect(r.sousTotalDepenses).toBe(2_600);
    expect(r.prixUnitaire).toBe(3_640);
  });

  it('surface L×P×H Auto → équiv A4 > 0', () => {
    const surf = calculatePaperBagSurface({
      longueur: 220,
      profondeur: 100,
      hauteur: 310,
      typeSac: 'Sac papier avec soufflet',
    });
    expect(surf.surfaceDeveloppeeM2).toBeGreaterThan(0);
    expect(surf.largeurDeveloppeeMm).toBe(2 * 220 + 2 * 100 + 20);
    expect(surf.surfaceAvecDechetsM2).toBeCloseTo(surf.surfaceDeveloppeeM2 * 1.1, 6);

    const r = calculatePaperBagPrice({
      longueur: 220,
      profondeur: 100,
      hauteur: 310,
      typeSac: 'Sac papier avec soufflet',
      matiere: 'PCB',
      grammage: '300g',
      formatEquivalent: 'Auto',
      poignees: 'Sans poignée',
      prixA4Impression: 1000,
      qty: 1,
    });
    expect(r.calculable).toBe(true);
    expect(r.equivA4).toBeGreaterThan(0);
  });

  it('parse format preset S (220×100×310mm)', () => {
    const d = parsePaperBagFormatDims('S (220×100×310mm)');
    expect(d).toEqual({ L: 220, P: 100, H: 310 });
  });

  it('avec œillets', () => {
    const r = calculatePaperBagPrice({
      formatEquivalent: 'A4',
      prixA4Impression: 1000,
      poignees: 'Sans poignée',
      oeillets: 2,
      margeDechetsPct: 10,
      beneficePct: 30,
      margeDepensePct: 10,
      qty: 1,
    });
    expect(r.prixAccessoires).toBe(160); // 80 × 2
    expect(r.sousTotalDepenses).toBe(1000 + 100 + 160);
  });
});
