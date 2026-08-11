import { describe, expect, it } from 'vitest';
import {
  parseGrandFormatDimensionsCm,
  cmToM,
  surfaceM2FromCm,
  formatClientDimensionsCm,
} from '@/lib/dimensions/grand-format-units';
import { computeGrandFormatDimensions } from '@/lib/pricing/format-dimensions';

describe('grand-format-units', () => {
  it('parse cm fields for bache', () => {
    expect(parseGrandFormatDimensionsCm({ longueur_cm: 125, largeur_cm: 300 })).toEqual({
      longueurCm: 125,
      largeurCm: 300,
    });
  });

  it('convert legacy meters to cm', () => {
    expect(parseGrandFormatDimensionsCm({ longueur_m: 2, hauteur_m: 1.2 })).toEqual({
      longueurCm: 200,
      largeurCm: 120,
    });
  });

  it('accepte largeur_m comme alias de longueur_m', () => {
    expect(parseGrandFormatDimensionsCm({ largeur_m: 2, hauteur_m: 1 })).toEqual({
      longueurCm: 200,
      largeurCm: 100,
    });
  });

  it('calcule surface m² depuis cm', () => {
    expect(surfaceM2FromCm(125, 300)).toBe(3.75);
    expect(cmToM(125)).toBe(1.25);
  });

  it('format récap dimensions client', () => {
    expect(formatClientDimensionsCm(125, 300)).toBe('125 × 300 cm');
  });

  it('computeGrandFormatDimensions utilise cm', () => {
    const d = computeGrandFormatDimensions({ largeur_cm: 125, hauteur_cm: 300 });
    expect(d).toEqual({ largeur: 125, hauteur: 300, m2: 3.75 });
  });
});
