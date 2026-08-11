import { beforeAll, describe, expect, it } from 'vitest';
import {
  computeCarnetAutocopiantPrice,
  setCarnetAutocopiantRuntimeParams,
} from '@/lib/pricing/carnet-autocopiant-pricing';
import { DEFAULT_CARNET_AUTOCOPIANT_PARAMS } from '@/lib/pricing/carnet-autocopiant-params';
import { setImpressionSfRuntimeRules } from '@/lib/pricing/impression-sf-pricing';
import { DEFAULT_PAPER_FORMAT_RULES } from '@/lib/pricing/paper-format-rules';

const params = {
  ...DEFAULT_CARNET_AUTOCOPIANT_PARAMS,
  prixA4Nb: 400,
  prixA4Quadri: 600,
  numerotationArPerPage: 50,
  reliureAr: 2000,
  perforationArPerA4: 50,
  couverture300gA3RectoAr: 3200,
  wastePct: 5,
};

describe('carnet autocopiant formula', () => {
  beforeAll(() => {
    setImpressionSfRuntimeRules({ formatRules: DEFAULT_PAPER_FORMAT_RULES });
    setCarnetAutocopiantRuntimeParams(params);
  });

  it('Test 1 — Duplicopie A4, 50 feuillets, sans numérotation', () => {
    const res = computeCarnetAutocopiantPrice({
      format: 'A4 — 210×297 mm',
      duplicopie: 'Duplicopie',
      feuillets: '50',
      impression_interieur: 'Niveaux de gris',
      numerotation: 'Sans numérotation',
    }, params);
    expect(res.calculable).toBe(true);
    expect(res.breakdown!.prixPapier).toBe(40000);
    expect(res.breakdown!.prixNumerotation).toBe(0);
    expect(res.breakdown!.prixReliure).toBe(2000);
    expect(res.breakdown!.prixPerforation).toBe(2500);
    expect(res.breakdown!.prixCouverture).toBe(3200);
    const sous = 40000 + 0 + 3200 + 2000 + 2500;
    expect(res.breakdown!.sousTotal).toBe(sous);
    expect(res.breakdown!.perteDechet).toBe(Math.round(sous * 0.05));
    expect(res.prixUnitaire).toBe(sous + Math.round(sous * 0.05));
  });

  it('Test 2 — Triplicopie A5, 50 feuillets, avec numérotation', () => {
    const res = computeCarnetAutocopiantPrice({
      format: 'A5 — 148×210 mm',
      duplicopie: 'Triplicopie',
      feuillets: '50',
      impression_interieur: 'Niveaux de gris',
      numerotation: 'Avec numérotation',
    }, params);
    expect(res.breakdown!.prixFormat).toBe(250);
    expect(res.breakdown!.prixPapier).toBe(250 * 3 * 50);
    expect(res.breakdown!.prixNumerotation).toBe(50 * 50);
  });

  it('Test 3 — Quadri intérieur ≠ niveaux de gris', () => {
    const ndg = computeCarnetAutocopiantPrice({
      format: 'A4',
      duplicopie: 'Duplicopie',
      feuillets: '25',
      impression_interieur: 'Niveaux de gris',
      numerotation: 'Sans numérotation',
    }, params);
    const quadri = computeCarnetAutocopiantPrice({
      format: 'A4',
      duplicopie: 'Duplicopie',
      feuillets: '25',
      impression_interieur: 'Quadri couleur',
      numerotation: 'Sans numérotation',
    }, params);
    expect(quadri.breakdown!.prixFormatA4).toBe(600);
    expect(ndg.breakdown!.prixFormatA4).toBe(400);
    expect(quadri.prixUnitaire).toBeGreaterThan(ndg.prixUnitaire);
  });

  it('Test 4–7 — façonnage + couverture + déchet', () => {
    const res = computeCarnetAutocopiantPrice({
      format: 'A4',
      duplicopie: 'Duplicopie',
      feuillets: '50',
      impression_interieur: 'Niveaux de gris',
      numerotation: 'Sans numérotation',
    }, params);
    expect(res.breakdown!.prixPerforation).toBeGreaterThan(0);
    expect(res.breakdown!.prixReliure).toBe(2000);
    expect(res.breakdown!.prixCouverture).toBe(3200);
    expect(res.breakdown!.wastePct).toBe(5);
    expect(res.breakdown!.perteDechet).toBe(Math.round(res.breakdown!.sousTotal * 0.05));
  });

  it('Test 8 — Admin numérotation modifiable', () => {
    const custom = { ...params, numerotationArPerPage: 80 };
    const res = computeCarnetAutocopiantPrice({
      format: 'A4',
      duplicopie: 'Duplicopie',
      feuillets: '50',
      impression_interieur: 'Niveaux de gris',
      numerotation: 'Avec numérotation',
    }, custom);
    expect(res.breakdown!.prixNumerotation).toBe(50 * 80);
  });
});
