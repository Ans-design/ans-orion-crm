import { describe, expect, it } from 'vitest';
import {
  applyCornerLimitChange,
  toggleCorner,
  emptyCornerRounding,
  isCornerRoundingComplete,
  cornerRoundingFromLegacy,
} from '@/lib/finition/corner-rounding';
import { normalizeFinitionConfig } from '@/lib/finition/finition-normalize';
import { filterPelliculageProcedeOptions } from '@/lib/finition/finition-field-policy';
import { validateFinitionConfig } from '@/lib/finition/finition-validation';
import {
  computePhysicalSheets,
  getPhysicalSheetsFromConfig,
} from '@/lib/data/binding-catalog';

describe('corner-rounding', () => {
  it('respecte la limite de sélection', () => {
    let state = emptyCornerRounding(2);
    state = toggleCorner(state, 'top-left');
    state = toggleCorner(state, 'bottom-left');
    expect(isCornerRoundingComplete(state)).toBe(true);
    const blocked = toggleCorner(state, 'top-right');
    expect(blocked.selected).toHaveLength(2);
  });

  it('permet la désélection', () => {
    let state = toggleCorner(emptyCornerRounding(2), 'top-left');
    state = toggleCorner(state, 'bottom-left');
    state = toggleCorner(state, 'bottom-left');
    expect(state.selected).toEqual(['top-left']);
  });

  it('ajuste quand la limite diminue', () => {
    let state = emptyCornerRounding(4);
    state = {
      ...state,
      selected: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    };
    const { state: next, adjusted } = applyCornerLimitChange(state, 2);
    expect(adjusted).toBe(true);
    expect(next.selected).toHaveLength(2);
  });

  it('migre legacy nb_coins', () => {
    const cr = cornerRoundingFromLegacy({ nb_coins: '3 coins', coins_arrondir: ['Haut gauche'] });
    expect(cr.limit).toBe(3);
    expect(cr.selected).toContain('top-left');
  });
});

describe('finition-normalize', () => {
  it('supprime zone dorure et verso seul', () => {
    const n = normalizeFinitionConfig('fin-dorure', {
      face: 'Verso seul',
      zone: 'Logo / texte',
      dim: 'SRA3',
    });
    expect(n.face).toBe('Recto seul');
    expect(n.zone).toBeUndefined();
  });

  it('force plastification R/V auto', () => {
    const n = normalizeFinitionConfig('fin-plastification', { face: 'Recto', dim: 'SRA3' });
    expect(n.face).toBe('Recto-Verso automatique');
    expect(n.dim).toBe('A3');
  });

  it('Mat pelliculage → à chaud', () => {
    const n = normalizeFinitionConfig('fin-pelliculage', {
      type: 'Mat',
      sous_type: 'Pelliculage à froid',
    });
    expect(n.sous_type).toBe('Pelliculage à chaud');
  });
});

describe('finition-field-policy', () => {
  it('Mat n\'autorise que à chaud', () => {
    const opts = filterPelliculageProcedeOptions('Mat', [
      'Pelliculage à chaud',
      'Pelliculage à froid',
    ]);
    expect(opts).toEqual(['Pelliculage à chaud']);
  });
});

describe('finition-validation', () => {
  it('bloque coins incomplets', () => {
    const err = validateFinitionConfig('fin-coins', {
      cornerRounding: { limit: 2, selected: ['top-left'], enabled: true },
    });
    expect(err).toMatch(/exactement 2 coins/);
  });

  it('exige format dorure', () => {
    expect(validateFinitionConfig('fin-dorure', { type: 'Dorure Or' })).toMatch(/format/);
  });
});

describe('binding physical sheets', () => {
  it('40 pages R/V = 20 feuilles', () => {
    expect(computePhysicalSheets(40, 'recto_verso')).toBe(20);
    expect(computePhysicalSheets(40, 'recto')).toBe(40);
  });

  it('getPhysicalSheetsFromConfig fin-reliure', () => {
    expect(
      getPhysicalSheetsFromConfig({ nb_pages: 41, face: 'Recto-Verso' }),
    ).toBe(21);
  });
});

describe('finition-pricing', () => {
  it('plastification skip R/V multiplier', async () => {
    const { shouldSkipRectoVersoMultiplier, getFinitionFaceCoefficient } = await import(
      '@/lib/finition/finition-pricing'
    );
    expect(shouldSkipRectoVersoMultiplier('fin-plastification', { face: 'Recto-Verso automatique' })).toBe(true);
    expect(getFinitionFaceCoefficient('fin-plastification', { face: 'Recto-Verso automatique' })).toBe(1);
  });

  it('A3 format doubles A4 base (vernis 5000 → 10000)', async () => {
    const { applyFinitionArticlePricing } = await import('@/lib/finition/finition-pricing');
    const { prixUnitaire } = applyFinitionArticlePricing(
      'fin-vernis',
      1200,
      { dim: 'A3', face: 'Recto' },
      100,
    );
    expect(prixUnitaire).toBe(10000);
  });

  it('coins ignore selected count — sélection descriptive', async () => {
    const { applyFinitionArticlePricing } = await import('@/lib/finition/finition-pricing');
    const { prixUnitaire } = applyFinitionArticlePricing(
      'fin-coins',
      50,
      { cornerRounding: { limit: 2, selected: ['top-left', 'bottom-left'], enabled: true } },
      100,
    );
    expect(prixUnitaire).toBe(50);
  });
});
