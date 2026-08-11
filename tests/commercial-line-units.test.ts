import { describe, it, expect } from 'vitest';
import { formatCommercialQtyCell, inferCommercialLineUnit } from '@/lib/documents/commercial-line-units';

describe('commercial line units', () => {
  it('uses m² when surface in config', () => {
    expect(inferCommercialLineUnit('gf-bache', { surface_m2: 4 })).toBe('m²');
  });

  it('formats GF dimensions in cm', () => {
    const cell = formatCommercialQtyCell(2, 'gf-bache', { longueur_cm: 200, largeur_cm: 100 });
    expect(cell).toContain('2 ex.');
    expect(cell).toContain('cm');
  });

  it('formats PF dimensions in mm', () => {
    const cell = formatCommercialQtyCell(500, 'pf-flyer', { longueur_mm: 210, largeur_mm: 297 });
    expect(cell).toContain('500 ex.');
    expect(cell).toContain('mm');
  });
});
