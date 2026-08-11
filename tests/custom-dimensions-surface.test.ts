import { describe, expect, it } from 'vitest';
import { getProductConfig } from '@/lib/data/config-types';
import { calculateCustomLxLSurface, resolvePackagingMaterialRecap } from '@/lib/packaging/material-recap';
import { calculateCustomDimensionsSurface } from '@/lib/packaging/custom-dimensions-surface';
import {
  productHasDedicatedLxLFields,
  shouldShowForcedPriceWarning,
} from '@/lib/pos/format-personnalise-policy';
import { shouldShowDimensionInputs } from '@/lib/pos/custom-field-ui';
import type { ConfigField } from '@/lib/data/config-types';

describe('custom-dimensions-surface', () => {
  it('calcule surface nette, brute et chute pour format personnalisé', () => {
    const result = calculateCustomDimensionsSurface({
      format: 'Format personnalisé',
      longueur: 100,
      largeur: 50,
    });
    expect(result).not.toBeNull();
    expect(result!.longueurMm).toBe(100);
    expect(result!.largeurMm).toBe(50);
    expect(result!.surfaceCm2).toBe(50);
    expect(result!.surfaceBruteCm2).toBe((200 * 150) / 100);
    expect(result!.surfaceChuteCm2).toBe((200 * 150) / 100);
    expect(result!.margeChuteMm).toBe(50);
  });

  it('calcule surface ronde pour diamètre personnalisé', () => {
    const result = calculateCustomDimensionsSurface({
      format: 'Format personnalisé',
      diametre_mm: 50,
    });
    expect(result).not.toBeNull();
    expect(result!.surfaceCm2).toBeCloseTo((Math.PI * 25 ** 2) / 100, 4);
  });

  it('ignore les presets sans format personnalisé', () => {
    expect(
      calculateCustomDimensionsSurface({ format: '50×50 mm', longueur: 50, largeur: 50 }),
    ).toBeNull();
  });

  it('intègre le récap POS étiquette', () => {
    const recap = resolvePackagingMaterialRecap('pkg-etiquette', {
      format: 'Format personnalisé',
      longueur: 80,
      largeur: 40,
    });
    expect(recap).not.toBeNull();
    expect(recap!.formatDeveloppe).toBe('80 × 40 mm');
    expect(recap!.formatBrut).toBe('180 × 140 mm');
    expect(recap!.surfaceCm2).toBe(Math.round((180 * 140) / 100));
  });

  it('calculateCustomLxLSurface expose margeRule', () => {
    const recap = calculateCustomLxLSurface({
      format: 'Format personnalisé',
      longueur: 60,
      largeur: 30,
    });
    expect(recap?.margeRule).toContain('chute');
  });
});

describe('format-personnalise-policy', () => {
  const etiquette = getProductConfig('pkg-etiquette');

  it('détecte les champs L×l dédiés sur étiquette', () => {
    expect(productHasDedicatedLxLFields(etiquette)).toBe(true);
  });

  it('masque alerte prix forcé quand L×l dédiés existent', () => {
    const field: ConfigField = {
      key: 'format',
      label: 'Format',
      type: 'chips',
      forcePriceValues: ['Format personnalisé'],
    };
    const etiquette = getProductConfig('pkg-etiquette');
    expect(shouldShowForcedPriceWarning(field, 'Format personnalisé', etiquette, 'pkg-etiquette')).toBe(false);
    expect(shouldShowForcedPriceWarning(field, 'Format personnalisé', null)).toBe(true);
  });

  it('masque bloc dimensions redondant pour étiquette', () => {
    const field: ConfigField = { key: 'format', label: 'Format', type: 'chips' };
    const etiquette = getProductConfig('pkg-etiquette');
    expect(
      shouldShowDimensionInputs(field, 'Format personnalisé', { productConfig: etiquette, articleId: 'pkg-etiquette' }),
    ).toBe(false);
    expect(
      shouldShowDimensionInputs(field, 'Format personnalisé', { articleId: 'fly-flyer' }),
    ).toBe(true);
  });
});
