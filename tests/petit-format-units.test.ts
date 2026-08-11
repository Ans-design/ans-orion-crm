import { describe, expect, it } from 'vitest';
import {
  formatClientDimensionsMm,
  parsePetitFormatDimensionsMm,
} from '@/lib/dimensions/petit-format-units';

describe('petit-format-units', () => {
  it('parse mm fields for carte de visite', () => {
    expect(parsePetitFormatDimensionsMm({ longueur: 85, largeur: 55 })).toEqual({
      longueurMm: 85,
      largeurMm: 55,
    });
  });

  it('format récap dimensions client en mm', () => {
    expect(formatClientDimensionsMm(85, 55)).toBe('85 × 55 mm');
  });

  it('parse format standard A4', () => {
    const d = parsePetitFormatDimensionsMm({ format: 'A4' });
    expect(d).toEqual({ longueurMm: 210, largeurMm: 297 });
  });
});
