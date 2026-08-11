import { describe, expect, it } from 'vitest';
import { getProductConfig } from '@/lib/data/config-types';
import {
  collectCustomFormatDimensionFields,
  formatOptionsSuggestVolume,
  isCustomFormatActive,
  isManagedCustomFormatDimensionField,
  shouldUseCustomFormatDimensionsPanel,
} from '@/lib/pos/custom-format-dimension-schema';

describe('custom-format-dimension-schema', () => {
  it('détecte les formats 3D dans les options', () => {
    expect(formatOptionsSuggestVolume(['XS (180×80×240mm)', 'Format personnalisé'])).toBe(true);
    expect(formatOptionsSuggestVolume(['A4 — 210×297 mm', 'Format personnalisé'])).toBe(false);
  });

  it('flyer : L×l uniquement en format personnalisé', () => {
    const cfg = getProductConfig('fly-a4')!;
    expect(isCustomFormatActive({ format: 'Format personnalisé' }, cfg)).toBe(true);
    const dims = collectCustomFormatDimensionFields(cfg);
    expect(dims.map((f) => f.key)).toEqual(['longueur', 'largeur']);
    expect(shouldUseCustomFormatDimensionsPanel('fly-a4', cfg, { format: 'Format personnalisé' })).toBe(true);
  });

  it('sac : L×P×H en format personnalisé', () => {
    const cfg = getProductConfig('pkg-sac')!;
    const dims = collectCustomFormatDimensionFields(cfg);
    expect(dims.map((f) => f.key)).toEqual(['longueur', 'profondeur', 'hauteur']);
  });

  it('doypack : largeur × hauteur × soufflet', () => {
    const cfg = getProductConfig('pkg-doypack')!;
    const dims = collectCustomFormatDimensionFields(cfg);
    expect(dims.map((f) => f.key)).toEqual(['custom_width', 'custom_height', 'custom_gusset']);
  });

  it('masque les champs numériques gérés hors grille (toujours)', () => {
    const cfg = getProductConfig('fly-a4')!;
    const field = cfg.sections[0].fields.find((f) => f.key === 'longueur')!;
    expect(
      isManagedCustomFormatDimensionField(field, cfg, { format: 'Format personnalisé', longueur: 100 }),
    ).toBe(true);
    expect(
      isManagedCustomFormatDimensionField(field, cfg, { format: 'A5 — 148×210 mm' }),
    ).toBe(true);
  });

  it('carterie : format_largeur/hauteur uniquement en format personnalisé', () => {
    const cfg = getProductConfig('cv-std')!;
    const dims = collectCustomFormatDimensionFields(cfg);
    expect(dims.map((f) => f.key)).toEqual(['format_largeur', 'format_hauteur']);
    const largeur = cfg.sections
      .flatMap((s) => s.fields)
      .find((f) => f.key === 'format_largeur')!;
    expect(largeur.showWhen?.values).toContain('Format personnalisé');
    expect(isManagedCustomFormatDimensionField(largeur, cfg, { format: '85×55 mm' })).toBe(true);
    expect(
      shouldUseCustomFormatDimensionsPanel('cv-std', cfg, { format: 'Format personnalisé' }),
    ).toBe(true);
    expect(
      shouldUseCustomFormatDimensionsPanel('cv-std', cfg, { format: '85×55 mm' }),
    ).toBe(false);
  });
});
