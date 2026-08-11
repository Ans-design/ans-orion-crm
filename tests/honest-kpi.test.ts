import { describe, expect, it } from 'vitest';
import { readHonestKpi } from '@/lib/dashboard/honest-kpi';

describe('readHonestKpi', () => {
  it('retourne null si indisponible (erreur totale)', () => {
    expect(
      readHonestKpi({ kpis: { caDay: 1000 }, unavailable: true }, 'caDay'),
    ).toBeNull();
  });

  it('retourne 0 calculé (vide métier, pas une erreur)', () => {
    expect(
      readHonestKpi({ kpis: { caDay: 0 }, unavailable: false }, 'caDay'),
    ).toBe(0);
  });

  it('en mode lite, clé absente → null (non calculée)', () => {
    expect(
      readHonestKpi({ kpis: { caDay: 12 }, unavailable: false, lite: true }, 'caYear'),
    ).toBeNull();
  });

  it('en mode full, clé absente → 0', () => {
    expect(
      readHonestKpi({ kpis: { caDay: 12 }, unavailable: false, lite: false }, 'caYear'),
    ).toBe(0);
  });

  it('prend la première clé disponible', () => {
    expect(
      readHonestKpi(
        { kpis: { margeGlobale: 18 }, unavailable: false },
        'margeReellePct',
        'margeGlobale',
      ),
    ).toBe(18);
  });
});
