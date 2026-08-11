import { describe, expect, it, beforeEach } from 'vitest';
import {
  flyerVoletsToPlis,
  flyerPliageFormatCoefficient,
  computeFlyerPliageUnitPrice,
  computeFlyerPrice,
} from '@/lib/pricing/flyer-pricing';
import {
  resetFlyerRuntimeParams,
  setFlyerRuntimeParams,
  buildCanonicalFlyerPricingRules,
} from '@/lib/pricing/flyer-pricing-rules';

describe('flyer volets → plis', () => {
  it('1 volet = 0 pli · 3 volets = 2 plis · 4 = 3', () => {
    expect(flyerVoletsToPlis('1 volet (feuille plate)')).toBe(0);
    expect(flyerVoletsToPlis('2 volets (1 pli)')).toBe(1);
    expect(flyerVoletsToPlis('3 volets (2 plis)')).toBe(2);
    expect(flyerVoletsToPlis('4 volets (3 plis)')).toBe(3);
    expect(flyerVoletsToPlis('5 volets')).toBe(4);
    expect(flyerVoletsToPlis('6 volets')).toBe(5);
    expect(flyerVoletsToPlis('Personnalisé')).toBe(-1);
  });
});

describe('flyer pliage format coeff', () => {
  it('A5=0.5 · A4=1 · A3=2', () => {
    expect(flyerPliageFormatCoefficient('A5 — 148×210 mm')).toBe(0.5);
    expect(flyerPliageFormatCoefficient('A4 — 210×297 mm')).toBe(1);
    expect(flyerPliageFormatCoefficient('A3 — 297×420 mm')).toBe(2);
  });
});

describe('flyer pliage unitaire', () => {
  beforeEach(() => {
    resetFlyerRuntimeParams();
    setFlyerRuntimeParams({ prixPliA4: 100 });
  });

  it('1 volet → 0 Ar pliage', () => {
    const r = computeFlyerPliageUnitPrice({
      format: 'A4 — 210×297 mm',
      volets: '1 volet (feuille plate)',
    });
    expect(r.plis).toBe(0);
    expect(r.prixPliageUnitaire).toBe(0);
  });

  it('A4 3 volets → 2 × 100 = 200 Ar', () => {
    const r = computeFlyerPliageUnitPrice({
      format: 'A4 — 210×297 mm',
      volets: '3 volets (2 plis)',
    });
    expect(r.plis).toBe(2);
    expect(r.prixPliageUnitaire).toBe(200);
  });

  it('A3 4 volets → 3 × 100 × 2 = 600 Ar', () => {
    const r = computeFlyerPliageUnitPrice({
      format: 'A3 — 297×420 mm',
      volets: '4 volets (3 plis)',
    });
    expect(r.plis).toBe(3);
    expect(r.coeff).toBe(2);
    expect(r.prixPliageUnitaire).toBe(600);
  });
});

describe('flyer price incomplete', () => {
  beforeEach(() => resetFlyerRuntimeParams());

  it('sans matière → Prix en attente (missing matiere)', () => {
    const r = computeFlyerPrice(
      {
        format: 'A4 — 210×297 mm',
        face: 'Recto',
        volets: '1 volet (feuille plate)',
      },
      100,
    );
    expect(r.calculable).toBe(false);
    expect(r.missingField).toBe('matiere');
  });
});

describe('flyer format impacte le prix (ISF)', () => {
  beforeEach(() => resetFlyerRuntimeParams());

  const base = {
    matiere: 'Papier Offset Standard',
    grammage: '135g',
    face: 'Recto verso',
    volets: '1 volet (feuille plate)',
    type: 'Quadri',
  };

  it('A6 < A5 < A4 < A3 pour même qty/matière', () => {
    const a6 = computeFlyerPrice({ ...base, format: 'A6 — 105×148 mm' }, 100);
    const a5 = computeFlyerPrice({ ...base, format: 'A5 — 148×210 mm' }, 100);
    const a4 = computeFlyerPrice({ ...base, format: 'A4 — 210×297 mm' }, 100);
    const a3 = computeFlyerPrice({ ...base, format: 'A3 — 297×420 mm' }, 100);

    expect(a6.calculable).toBe(true);
    expect(a5.calculable).toBe(true);
    expect(a4.calculable).toBe(true);
    expect(a3.calculable).toBe(true);

    expect(a6.prixUnitaire).toBeLessThan(a5.prixUnitaire);
    expect(a5.prixUnitaire).toBeLessThan(a4.prixUnitaire);
    expect(a4.prixUnitaire).toBeLessThan(a3.prixUnitaire);
  });

  it('Carré 90×90 < A6', () => {
    const carre = computeFlyerPrice({ ...base, format: 'Carré — 90×90 mm' }, 100);
    const a6 = computeFlyerPrice({ ...base, format: 'A6 — 105×148 mm' }, 100);
    expect(carre.calculable).toBe(true);
    expect(a6.calculable).toBe(true);
    expect(carre.prixUnitaire).toBeLessThanOrEqual(a6.prixUnitaire);
  });
});

describe('prix 2026 grid ne court-circuite plus les flyers', () => {
  it('tryComputePrix2026GridPrice renvoie null pour fly-std', async () => {
    const { tryComputePrix2026GridPrice } = await import('@/lib/pricing/prix-2026-grid-price');
    const r = await tryComputePrix2026GridPrice('fly-std', {
      format: 'A6 — 105×148 mm',
      qty: 100,
    });
    expect(r).toBeNull();
  });
});

describe('flyer rules excel matrix', () => {
  it('construit FLYER_REGLES_PRIX sans dupliquer ISF', () => {
    const rows = buildCanonicalFlyerPricingRules();
    expect(rows.length).toBeGreaterThanOrEqual(5);
    expect(rows.every((r) => r.sourcePrixBase.includes('Impression'))).toBe(true);
    expect(rows.every((r) => r.typeCalcul === 'isf_plus_pliage')).toBe(true);
    const three = rows.find((r) => /3 volets/i.test(r.nombreVolets));
    expect(three?.nombrePlis).toBe(2);
  });
});
