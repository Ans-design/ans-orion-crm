import { describe, expect, it } from 'vitest';
import { getProductConfig } from '@/lib/data/config-types';
import {
  calculateDoypackSurface,
  calculateGobeletSurface,
  calculateSacPaperSurface,
  resolvePackagingMaterialRecap,
} from '@/lib/packaging/material-recap';

describe('PKG_DOYPACK config', () => {
  it('ne contient plus le champ emplacement', () => {
    const cfg = getProductConfig('pkg-doypack');
    const keys = cfg?.sections.flatMap((s) => s.fields.map((f) => f.key)) ?? [];
    expect(keys).not.toContain('emplacement');
    expect(keys).not.toContain('emplacement_details');
  });

  it('ne contient plus Couleur du support', () => {
    const cfg = getProductConfig('pkg-doypack');
    const keys = cfg?.sections.flatMap((s) => s.fields.map((f) => f.key)) ?? [];
    expect(keys).not.toContain('couleur_support');
    expect(keys).not.toContain('custom_color_ref');
  });
});

describe('packaging material recap', () => {
  it('calcule le sac papier avec soufflets (défaut sans type_sac)', () => {
    const r = calculateSacPaperSurface({
      format: 'S (220×100×310mm)',
    });
    expect(r).not.toBeNull();
    expect(r!.formatDeveloppe).toContain('×');
    expect(r!.surfaceM2).toBeGreaterThan(0);
  });

  it('calcule le gobelet impression partielle', () => {
    const r = calculateGobeletSurface({
      face: 'Impression partielle',
      zone_impression_longueur: 80,
      zone_impression_largeur: 50,
    });
    expect(r).not.toBeNull();
    expect(r!.L).toBe(80);
    expect(r!.H).toBe(50);
    expect(r!.surfaceMm2).toBeGreaterThan(80 * 50);
  });

  it('calcule le gobelet impression totale via gabarit', () => {
    const r = calculateGobeletSurface({
      face: 'Impression totale',
      contenance: '8 oz (240 ml)',
    });
    expect(r).not.toBeNull();
    expect(r!.surfaceM2).toBeGreaterThan(0);
  });

  it('calcule le doypack format standard', () => {
    const r = calculateDoypackSurface({
      format: '100×150mm',
      matiere: 'Kraft',
    });
    expect(r).not.toBeNull();
    expect(r!.L).toBe(100);
    expect(r!.H).toBe(150);
  });

  it('route par articleId', () => {
    expect(resolvePackagingMaterialRecap('pkg-doypack', { format: '90×140mm' })?.L).toBe(90);
    expect(
      resolvePackagingMaterialRecap('pkg-boite', {
        structure: 'Expédition',
        longueur: 100,
        hauteur: 80,
        profondeur: 40,
      })?.surfaceMm2,
    ).toBeGreaterThan(0);
  });
});

describe('PKG_ETIQUETTE config', () => {
  it('ne contient plus le champ type_details redondant', () => {
    const cfg = getProductConfig('pkg-etiquette');
    const keys = cfg?.sections.flatMap((s) => s.fields.map((f) => f.key)) ?? [];
    expect(keys).not.toContain('type_details');
  });
});

describe('PKG_GOBELET config', () => {
  it('calcule impression totale avec contenance personnalisée (ml + dimensions)', () => {
    const byMl = calculateGobeletSurface({
      face: 'Impression totale',
      contenance: 'Autres',
      contenance_ml: 240,
    });
    expect(byMl).not.toBeNull();
    expect(byMl!.surfaceM2).toBeGreaterThan(0);

    const byDims = calculateGobeletSurface({
      face: 'Impression totale',
      contenance: 'Autres',
      gobelet_diametre_mm: 80,
      gobelet_hauteur_mm: 75,
    });
    expect(byDims).not.toBeNull();
    expect(byDims!.L).toBeGreaterThan(200);
    expect(byDims!.H).toBe(75);
  });
});
