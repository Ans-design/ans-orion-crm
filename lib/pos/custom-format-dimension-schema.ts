import type { ConfigField, ProductConfig } from '@/lib/data/config-types';
import { isCustomFormatChipValue } from '@/lib/pos/generated-format-label';

const FORMAT_CHIP_KEYS = new Set(['format', 'dimension', 'format_marquage', 'diametre', 'taille']);

const MANAGED_DIM_ORDER = [
  'format_largeur',
  'format_hauteur',
  'longueur',
  'largeur',
  'custom_width',
  'custom_height',
  'profondeur',
  'hauteur',
  'custom_gusset',
  'hauteur_couvercle',
  'zone_impression_longueur',
  'zone_impression_largeur',
  'diametre_mm',
  'cote',
] as const;

export function formatOptionsSuggestVolume(options: string[]): boolean {
  return options.some(
    (o) =>
      /\d+\s*[×x]\s*\d+\s*[×x]\s*\d+/.test(o)
      || /L\s*×\s*P\s*×\s*H/i.test(o)
      || /\(.*×.*×.*mm\)/i.test(o),
  );
}

function allFields(productConfig: ProductConfig): ConfigField[] {
  return productConfig.sections.flatMap((s) => s.fields);
}

function fieldKeys(productConfig: ProductConfig): Set<string> {
  return new Set(allFields(productConfig).map((f) => f.key));
}

function customTriggersForField(field: ConfigField): string[] {
  const fromOptions = (field.options ?? []).filter((o) => isCustomFormatChipValue(o));
  if (fromOptions.length) return fromOptions;

  const fromFilter = Object.values(field.optionsFilter?.optionsByValue ?? {})
    .flat()
    .filter((o) => isCustomFormatChipValue(o));
  if (fromFilter.length) return [...new Set(fromFilter)];

  if ((field.forcePriceValues ?? []).some((o) => isCustomFormatChipValue(o))) {
    return ['Format personnalisé'];
  }

  return [];
}

export function getCustomFormatTrigger(
  productConfig: ProductConfig,
): { field: ConfigField; triggers: string[] } | null {
  for (const section of productConfig.sections) {
    for (const field of section.fields) {
      if (field.type !== 'chips' || !FORMAT_CHIP_KEYS.has(field.key)) continue;
      const triggers = customTriggersForField(field);
      if (triggers.length) return { field, triggers };
    }
  }
  return null;
}

export function isCustomFormatActive(
  config: Record<string, unknown>,
  productConfig: ProductConfig | null | undefined,
): boolean {
  if (!productConfig) return false;
  const trigger = getCustomFormatTrigger(productConfig);
  if (!trigger) return false;
  return isCustomFormatChipValue(config[trigger.field.key]);
}

export function inferVolumeDimensionKeys(
  productConfig: ProductConfig,
  formatField?: ConfigField,
): string[] {
  const keys = fieldKeys(productConfig);
  const extras: string[] = [];
  const hauteurField = allFields(productConfig).find((f) => f.key === 'hauteur');

  if (keys.has('profondeur')) extras.push('profondeur');
  if (keys.has('custom_gusset')) extras.push('custom_gusset');
  if (keys.has('hauteur_couvercle')) extras.push('hauteur_couvercle');
  if (keys.has('zone_impression_longueur') && keys.has('zone_impression_largeur')) {
    extras.push('zone_impression_longueur', 'zone_impression_largeur');
  }

  if (
    hauteurField?.type === 'number'
    && (extras.includes('profondeur') || formatOptionsSuggestVolume(formatField?.options ?? []))
  ) {
    extras.push('hauteur');
  }

  if (
    !extras.length
    && formatField
    && formatOptionsSuggestVolume(formatField.options ?? [])
  ) {
    extras.push('profondeur', 'hauteur');
  }

  return extras;
}

/** Champs numériques à afficher dans le panneau « Dimensions personnalisées ». */
export function collectCustomFormatDimensionFields(productConfig: ProductConfig): ConfigField[] {
  const trigger = getCustomFormatTrigger(productConfig);
  if (!trigger) return [];

  const fields = allFields(productConfig);
  const byKey = new Map(fields.map((f) => [f.key, f]));
  const keys = fieldKeys(productConfig);
  const ordered: ConfigField[] = [];

  const push = (key: string) => {
    const f = byKey.get(key);
    if (f?.type === 'number' && !ordered.some((x) => x.key === key)) ordered.push(f);
  };

  if (keys.has('diametre_mm')) {
    push('diametre_mm');
    return ordered;
  }

  if (keys.has('format_largeur') && keys.has('format_hauteur')) {
    push('format_largeur');
    push('format_hauteur');
    return ordered;
  }

  if (keys.has('custom_width') && keys.has('custom_height')) {
    push('custom_width');
    push('custom_height');
    push('custom_gusset');
    return ordered;
  }

  push('longueur');
  push('largeur');

  for (const key of inferVolumeDimensionKeys(productConfig, trigger.field)) {
    push(key);
  }

  return ordered.sort(
    (a, b) =>
      MANAGED_DIM_ORDER.indexOf(a.key as (typeof MANAGED_DIM_ORDER)[number])
      - MANAGED_DIM_ORDER.indexOf(b.key as (typeof MANAGED_DIM_ORDER)[number]),
  );
}

export function isCustomFormatChipField(field: ConfigField): boolean {
  if (field.type !== 'chips' || !FORMAT_CHIP_KEYS.has(field.key)) return false;
  return customTriggersForField(field).length > 0;
}

export function shouldUseCustomFormatDimensionsPanel(
  articleId: string,
  productConfig: ProductConfig | null | undefined,
  config: Record<string, unknown>,
): boolean {
  if (!productConfig || articleId.startsWith('gf-')) return false;
  if (!isCustomFormatActive(config, productConfig)) return false;
  return collectCustomFormatDimensionFields(productConfig).length > 0;
}

/**
 * Champs dimensions du format personnalisé : toujours hors grille Format.
 * - Format standard (85×55, A4…) → cachés
 * - Format personnalisé → panneau Dimensions dédié (pas de doublon dans la grille)
 */
export function isManagedCustomFormatDimensionField(
  field: ConfigField,
  productConfig: ProductConfig | null | undefined,
  _config?: Record<string, unknown>,
): boolean {
  if (!productConfig || field.type !== 'number') return false;
  return collectCustomFormatDimensionFields(productConfig).some((f) => f.key === field.key);
}
