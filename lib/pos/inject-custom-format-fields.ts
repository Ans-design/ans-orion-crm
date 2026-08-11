import type { ConfigField, ProductConfig } from '@/lib/data/config-types';
import { isCustomFormatChipValue } from '@/lib/pos/generated-format-label';
import { formatOptionsSuggestVolume } from '@/lib/pos/custom-format-dimension-schema';

const FORMAT_CHIP_KEYS = new Set(['format', 'dimension', 'format_marquage', 'diametre', 'taille']);

const DEDICATED_DIMENSION_KEYS = new Set([
  'longueur',
  'largeur',
  'hauteur',
  'profondeur',
  'custom_width',
  'custom_height',
  'custom_gusset',
  'longueur_cm',
  'largeur_cm',
  'zone_impression_longueur',
  'zone_impression_largeur',
  'diametre_mm',
  'cote',
]);

function cloneConfig(config: ProductConfig): ProductConfig {
  return {
    ...config,
    sections: config.sections.map((s) => ({
      ...s,
      fields: [...s.fields],
    })),
  };
}

function customTriggerValues(field: ConfigField): string[] {
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

function sectionHasDedicatedDims(
  fields: ConfigField[],
  triggerField: string,
  triggerValues: string[],
): boolean {
  return fields.some((f) => {
    if (f.type !== 'number' || !DEDICATED_DIMENSION_KEYS.has(f.key)) return false;
    if (!f.showWhen) return true;
    return (
      f.showWhen.field === triggerField
      && f.showWhen.values.some((v) => triggerValues.includes(v))
    );
  });
}

function lxlFields(triggerField: string, triggerValues: string[], min = 1): ConfigField[] {
  const showWhen = { field: triggerField, values: triggerValues };
  return [
    {
      key: 'longueur',
      label: 'Longueur L (mm)',
      type: 'number',
      min,
      suffix: 'mm',
      showWhen,
    },
    {
      key: 'largeur',
      label: 'Largeur l (mm)',
      type: 'number',
      min,
      suffix: 'mm',
      showWhen,
    },
  ];
}

function diametreMmField(triggerField: string, triggerValues: string[]): ConfigField {
  return {
    key: 'diametre_mm',
    label: 'Diamètre (mm)',
    type: 'number',
    min: 1,
    suffix: 'mm',
    showWhen: { field: triggerField, values: triggerValues },
  };
}

function volumeFields(triggerField: string, triggerValues: string[]): ConfigField[] {
  const showWhen = { field: triggerField, values: triggerValues };
  return [
    {
      key: 'profondeur',
      label: 'Profondeur P (mm)',
      type: 'number',
      min: 1,
      suffix: 'mm',
      showWhen,
    },
    {
      key: 'hauteur',
      label: 'Hauteur H (mm)',
      type: 'number',
      min: 1,
      suffix: 'mm',
      showWhen,
    },
  ];
}

/** Ajoute longueur/largeur (ou diamètre) numériques pour chaque chip « format personnalisé » sans champs dédiés. */
export function injectCustomFormatDimensionFields(config: ProductConfig | null): ProductConfig | null {
  if (!config?.sections?.length) return config;

  const next = cloneConfig(config);
  let changed = false;

  for (const section of next.sections) {
    const newFields: ConfigField[] = [];

    for (const field of section.fields) {
      newFields.push(field);

      if (field.type !== 'chips' || !FORMAT_CHIP_KEYS.has(field.key)) continue;

      const triggers = customTriggerValues(field);
      if (!triggers.length) continue;
      if (sectionHasDedicatedDims(section.fields, field.key, triggers)) continue;

      if (field.key === 'diametre') {
        newFields.push(diametreMmField(field.key, triggers));
      } else {
        newFields.push(...lxlFields(field.key, triggers));
        const allOpts = [
          ...(field.options ?? []),
          ...Object.values(field.optionsFilter?.optionsByValue ?? {}).flat(),
        ];
        if (formatOptionsSuggestVolume(allOpts)) {
          const hasVolume = [...section.fields, ...newFields].some((f) =>
            ['profondeur', 'hauteur'].includes(f.key),
          );
          if (!hasVolume) {
            newFields.push(...volumeFields(field.key, triggers));
          }
        }
      }
      changed = true;
    }

    section.fields = newFields;
  }

  return changed ? next : config;
}
