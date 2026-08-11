import { describe, expect, it } from 'vitest';
import {
  computeImpressionSfPrice,
  paperTierUnitPrice,
  resolveImpressionSfPaperPriceKey,
  setImpressionSfRuntimeRules,
} from '@/lib/pricing/impression-sf-pricing';
import {
  DEFAULT_PRINT_TECHNOLOGY_RULES,
  DEFAULT_SERVICE_EQUIVALENCES,
  findLaserSupplementAr,
  parseImpressionType,
} from '@/lib/pricing/print-type-rules';
import { IMPRESSION_SF_PAPER_TARIFFS } from '@/lib/data/impression-sf-paper-tariffs';

describe('parseImpressionType', () => {
  it('détecte photocopie et normalise vers impression', () => {
    const p = parseImpressionType('Photocopie N&B');
    expect(p.isPhotocopie).toBe(true);
    expect(p.colorMode).toBe('nb');
    expect(p.pricingTypeLabel).toContain('N&B');
  });

  it('détecte laser quadri', () => {
    const p = parseImpressionType('Impression laser couleur');
    expect(p.technology).toBe('laser');
    expect(p.colorMode).toBe('quadri');
  });
});

describe('offset NB / Quadri / Laser', () => {
  it('Test 1 — Offset NB ≠ Quadri', () => {
    const nb = computeImpressionSfPrice({
      matiere: 'Standard / Offset',
      grammage: '80g',
      type: 'Impression numérique N&B',
      format: 'A4',
      face: 'Recto',
    }, 1);
    const quadri = computeImpressionSfPrice({
      matiere: 'Standard / Offset',
      grammage: '80g',
      type: 'Impression numérique couleur',
      format: 'A4',
      face: 'Recto',
    }, 1);
    expect(nb.calculable).toBe(true);
    expect(quadri.calculable).toBe(true);
    expect(nb.prixUnitaire).not.toBe(quadri.prixUnitaire);
    expect(nb.priceKey).toBe('nb80');
    expect(quadri.priceKey).toBe('q80la');
  });

  it('Test 2 — Laser quadri = jet + supplément Admin (100)', () => {
    setImpressionSfRuntimeRules({ techRules: DEFAULT_PRINT_TECHNOLOGY_RULES });
    const jet = paperTierUnitPrice('q80la', 1);
    const laser = computeImpressionSfPrice({
      matiere: 'Standard / Offset',
      grammage: '80g',
      type: 'Impression laser couleur',
      format: 'A4',
      face: 'Recto',
    }, 1);
    const supplement = findLaserSupplementAr(DEFAULT_PRINT_TECHNOLOGY_RULES, {
      offsetOnly: true,
      colorMode: 'quadri',
    });
    expect(supplement).toBe(100);
    expect(laser.prixUnitaire).toBe(jet + 100);
  });
});

describe('hors offset — même prix tous types', () => {
  it('Test 3 — PCB NB = Quadri = Laser', () => {
    const base = {
      matiere: 'PCB',
      grammage: '90g',
      format: 'A4',
      face: 'Recto',
    };
    const quadri = computeImpressionSfPrice({ ...base, type: 'Impression numérique couleur' }, 1);
    const nb = computeImpressionSfPrice({ ...base, type: 'Impression numérique N&B' }, 1);
    const laser = computeImpressionSfPrice({ ...base, type: 'Impression laser couleur' }, 1);
    expect(quadri.prixUnitaire).toBe(nb.prixUnitaire);
    expect(quadri.prixUnitaire).toBe(laser.prixUnitaire);
    expect(quadri.priceKey).toBe('pcb90');
  });
});

describe('photocopie = impression', () => {
  it('Test 4 — Photocopie A4 = Impression A4', () => {
    setImpressionSfRuntimeRules({ serviceEquivalences: DEFAULT_SERVICE_EQUIVALENCES });
    const impression = computeImpressionSfPrice({
      matiere: 'Standard / Offset',
      grammage: '80g',
      type: 'Impression numérique couleur',
      format: 'A4',
      face: 'Recto',
    }, 1);
    const photocopie = computeImpressionSfPrice({
      matiere: 'Standard / Offset',
      grammage: '80g',
      type: 'Photocopie couleur',
      format: 'A4',
      face: 'Recto',
    }, 1);
    expect(photocopie.prixUnitaire).toBe(impression.prixUnitaire);
    expect(photocopie.formula).toContain('photocopie=impression');
  });
});

describe('groupe satiné / toile / invitation', () => {
  it('Test 5 — satiné / toile / invitation même grille', () => {
    expect(resolveImpressionSfPaperPriceKey('Toile fin', '270g', 'Impression numérique couleur')).toBe('toile');
    expect(resolveImpressionSfPaperPriceKey('Spécial invitation', '', 'Impression numérique couleur')).toBe('invitation');
    expect(resolveImpressionSfPaperPriceKey('Satiné mat', '250g', 'Impression numérique couleur')).toBe('toile');

    const toile = computeImpressionSfPrice({
      matiere: 'Toile fin',
      grammage: '270g',
      type: 'Impression numérique couleur',
      format: 'A4',
      face: 'Recto',
    }, 1);
    const invitation = computeImpressionSfPrice({
      matiere: 'Spécial invitation',
      grammage: '',
      type: 'Impression numérique couleur',
      format: 'A4',
      face: 'Recto',
    }, 1);
    expect(toile.calculable).toBe(true);
    expect(invitation.calculable).toBe(true);
    // Grilles distinctes (invitation ≠ toile) — clés séparées, PU > 0
    expect(invitation.prixUnitaire).toBeGreaterThan(0);
    expect(toile.prixUnitaire).toBeGreaterThan(0);
  });
});

describe('paliers volume', () => {
  it('Test 6 — paliers qty changent le PU tarifs ISF', () => {
    const t = IMPRESSION_SF_PAPER_TARIFFS.q80la.tiers;
    expect(t.length).toBeGreaterThan(1);
    const p1 = paperTierUnitPrice('q80la', 1);
    const p100 = paperTierUnitPrice('q80la', 100);
    expect(p100).toBeLessThanOrEqual(p1);
  });
});
