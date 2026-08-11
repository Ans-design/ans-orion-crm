import { describe, expect, it } from 'vitest';
import { getProductConfig } from '@/lib/data/config-types';
import { calculateCustomDimensionsSurface } from '@/lib/packaging/custom-dimensions-surface';
import { shouldShowTypedCustomBlock } from '@/lib/pos/custom-field-ui';
import {
  collectCustomFormatDimensionFields,
  shouldUseCustomFormatDimensionsPanel,
} from '@/lib/pos/custom-format-dimension-schema';
import { filterProductConfigForPos } from '@/lib/pos/filter-pos-config';
import { resolveDisplayFormatLabel } from '@/lib/pos/generated-format-label';
import { resolveCustomSurfaceRecap } from '@/lib/pos/custom-surface-recap';
import { buildWorkOrderLines } from '@/lib/production/work-order-lines';

const GOODIES_WITH_CUSTOM_FORMAT = [
  { id: 'gd-tasse', trigger: 'diametre', value: 'Format personnalisé', dims: ['diametre_mm'] },
  { id: 'gd-tapis', trigger: 'format', value: 'Format personnalisé', dims: ['longueur', 'largeur'] },
  { id: 'gd-briquet', trigger: 'taille', value: 'Modèle personnalisé', dims: ['longueur', 'largeur'] },
  { id: 'gd-parapluie', trigger: 'diametre', value: 'Diamètre personnalisé', dims: ['diametre_mm'] },
  { id: 'gd-portecles', trigger: 'format', value: 'Format personnalisé', dims: ['longueur', 'largeur'] },
  { id: 'gd-pins', trigger: 'format', value: 'Format personnalisé', dims: ['diametre_mm'] },
  { id: 'gd-housse', trigger: 'format', value: 'Format personnalisé', dims: ['longueur', 'largeur'] },
] as const;

const ALL_GOODIES = [
  'gd-mug',
  'gd-tasse',
  'gd-gourde',
  'gd-tapis',
  'gd-briquet',
  'gd-usb',
  'gd-parapluie',
  'gd-stylo',
  'gd-portecles',
  'gd-pins',
  'gd-housse',
] as const;

function posFieldKeys(articleId: string): string[] {
  const cfg = filterProductConfigForPos(getProductConfig(articleId));
  return cfg?.sections.flatMap((s) => s.fields.map((f) => f.key)) ?? [];
}

describe('goodies rectifications — formats personnalisés', () => {
  it.each(GOODIES_WITH_CUSTOM_FORMAT)(
    '$id : dimensions numériques uniquement, pas de champs texte redondants',
    ({ id, trigger, value, dims }) => {
      const keys = posFieldKeys(id);
      for (const dim of dims) expect(keys).toContain(dim);
      expect(keys.filter((k) => k.includes(`${trigger}_custom`))).toHaveLength(0);

      const pc = getProductConfig(id)!;
      const field = pc.sections.flatMap((s) => s.fields).find((f) => f.key === trigger);
      expect(field).toBeDefined();
      expect(
        shouldShowTypedCustomBlock(field!, value, {
          productConfig: pc,
          articleId: id,
          useCustomFormatPanel: shouldUseCustomFormatDimensionsPanel(id, pc, { [trigger]: value }),
        }),
      ).toBe(false);

      const collected = collectCustomFormatDimensionFields(pc).map((f) => f.key);
      expect(collected).toEqual(dims);
    },
  );

  it('génère le libellé rectangle depuis L×l', () => {
    expect(
      resolveDisplayFormatLabel({
        format: 'Format personnalisé',
        longueur: 100,
        largeur: 50,
      }),
    ).toBe('100 × 50 mm');
  });

  it('génère le libellé diamètre depuis diametre_mm', () => {
    expect(
      resolveDisplayFormatLabel({
        format: 'Format personnalisé',
        diametre_mm: 50,
      }),
    ).toBe('Ø 50 mm');
  });

  it('calcule la surface ronde (pin\'s)', () => {
    const surface = calculateCustomDimensionsSurface({
      format: 'Format personnalisé',
      diametre_mm: 50,
    });
    expect(surface).not.toBeNull();
    expect(surface!.longueurMm).toBe(50);
    expect(surface!.surfaceCm2).toBeCloseTo((Math.PI * 25 ** 2) / 100, 4);
  });

  it('calcule la surface rectangle (porte-clés)', () => {
    const surface = calculateCustomDimensionsSurface({
      format: 'Format personnalisé',
      longueur: 40,
      largeur: 35,
    });
    expect(surface!.surfaceCm2).toBe(14);
    const recap = resolveCustomSurfaceRecap('gd-portecles', {
      format: 'Format personnalisé',
      longueur: 40,
      largeur: 35,
    }, 10);
    expect(recap?.formatLabel).toBe('40 × 35 mm');
    expect(recap?.realSurfaceM2).toBeGreaterThan(0);
  });

  it('fiche production : dimensions et note unique', () => {
    const lines = buildWorkOrderLines('gd-portecles', {
      format: 'Format personnalisé',
      longueur: 40,
      largeur: 35,
      technique: 'Gravure laser',
      fichier_joint: 'Dépôt via BAT / commande',
      remarques: 'Logo gravé face avant',
      qty: 100,
    });
    expect(lines.some((l) => /40 × 35 mm/i.test(l))).toBe(true);
    expect(lines.some((l) => /notes & remarques/i.test(l))).toBe(true);
    expect(lines.some((l) => /logo gravé/i.test(l))).toBe(true);
  });
});

describe('goodies rectifications — fichier & notes', () => {
  it.each(ALL_GOODIES)('%s : une seule zone Notes & remarques visible au POS', (articleId) => {
    const cfg = filterProductConfigForPos(getProductConfig(articleId));
    const notesSection = cfg?.sections.find((s) => s.title === 'Fichier & notes');
    expect(notesSection).toBeDefined();
    expect(notesSection!.fields.map((f) => f.key)).toEqual(['fichier_joint', 'remarques']);
    expect(notesSection!.fields.find((f) => f.key === 'remarques')?.label).toBe('Notes & remarques');
  });

  it.each(ALL_GOODIES)('%s : anciens champs notes masqués au POS', (articleId) => {
    const keys = posFieldKeys(articleId);
    expect(keys).not.toContain('fichier_visuel');
    expect(keys).not.toContain('note_emplacement_marquage');
    expect(keys).not.toContain('note_production');
  });

  it('conserve les champs archivés dans le catalogue complet', () => {
    const full = getProductConfig('gd-mug');
    const archived = full?.sections.find((s) => s.title === 'Notes (archivé)');
    expect(archived?.posHidden).toBe(true);
    expect(archived?.fields.map((f) => f.key)).toEqual([
      'fichier_visuel',
      'note_emplacement_marquage',
      'note_production',
    ]);
  });
});
