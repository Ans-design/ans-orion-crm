import { describe, expect, it } from 'vitest';
import { getProductConfig } from '@/lib/data/config-types';
import {
  buildGeneratedFormatLabel,
  isCustomFormatChipValue,
  resolveDisplayFormatLabel,
} from '@/lib/pos/generated-format-label';
import { injectCustomFormatDimensionFields } from '@/lib/pos/inject-custom-format-fields';
import { productHasDedicatedDimensionFields } from '@/lib/pos/format-personnalise-policy';
import { shouldShowDimensionInputs, shouldShowTypedCustomBlock } from '@/lib/pos/custom-field-ui';
import type { ConfigField } from '@/lib/data/config-types';

describe('generated-format-label', () => {
  it('génère un libellé L×l en mm', () => {
    expect(buildGeneratedFormatLabel({ longueur: 100, largeur: 50 })).toBe('100 × 50 mm');
    expect(buildGeneratedFormatLabel({ longueur: 100, largeur: 50, hauteur: 30 })).toBe('100 × 50 × 30 mm');
  });

  it('génère doypack L×l×soufflet', () => {
    expect(
      buildGeneratedFormatLabel({ custom_width: 30, custom_height: 50, custom_gusset: 10 }),
    ).toBe('30 × 50 × 10 mm');
  });

  it('resolveDisplayFormatLabel remplace le chip personnalisé', () => {
    expect(
      resolveDisplayFormatLabel({ format: 'Format personnalisé', longueur: 90, largeur: 140 }),
    ).toBe('90 × 140 mm');
    expect(resolveDisplayFormatLabel({ format: 'A4 — 210×297 mm' })).toBe('A4 — 210×297 mm');
  });

  it('détecte les chips personnalisés', () => {
    expect(isCustomFormatChipValue('Format personnalisé')).toBe(true);
    expect(isCustomFormatChipValue('Diamètre personnalisé')).toBe(true);
    expect(isCustomFormatChipValue('A4')).toBe(false);
  });
});

describe('inject-custom-format-fields', () => {
  it('injecte longueur/largeur sur impression sans champs dédiés', () => {
    const raw = getProductConfig('imp-impression');
    expect(raw).not.toBeNull();
    expect(productHasDedicatedDimensionFields(raw)).toBe(true);
    const formatSection = raw!.sections.find((s) => s.fields.some((f) => f.key === 'format'));
    const keys = formatSection!.fields.map((f) => f.key);
    expect(keys).toContain('longueur');
    expect(keys).toContain('largeur');
  });

  it('ne double pas les champs sur étiquette', () => {
    const cfg = getProductConfig('pkg-etiquette');
    const longueurFields = cfg!.sections.flatMap((s) => s.fields).filter((f) => f.key === 'longueur');
    expect(longueurFields).toHaveLength(1);
  });

  it('masque le bloc dimensions texte sur flyer après injection', () => {
    const cfg = getProductConfig('fly-a4');
    const field: ConfigField = { key: 'format', label: 'Format', type: 'chips' };
    expect(
      shouldShowDimensionInputs(field, 'Format personnalisé', { productConfig: cfg, articleId: 'fly-a4' }),
    ).toBe(false);
    expect(
      shouldShowTypedCustomBlock(field, 'Format personnalisé', {
        productConfig: cfg,
        articleId: 'fly-a4',
        useCustomFormatPanel: true,
      }),
    ).toBe(false);
  });
});

describe('inject idempotent', () => {
  it('ne modifie pas deux fois la config', () => {
    const once = getProductConfig('imp-impression');
    const twice = injectCustomFormatDimensionFields(once);
    expect(twice).toBe(once);
  });
});
