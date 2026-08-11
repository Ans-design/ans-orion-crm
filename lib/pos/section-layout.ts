import type { ConfigField, ConfigSection } from '@/lib/data/config-types';
import { isCustomOptionValue } from '@/lib/pos/custom-field-ui';

export type SectionLayout = 'stack' | 'grid-2' | 'grid-3';

export function isFieldVisible(field: ConfigField, config: Record<string, unknown>): boolean {
  if (!field.showWhen) return true;
  const depVal = config[field.showWhen.field];
  return field.showWhen.values.includes(depVal as string);
}

/** Options visibles pour un champ chips (showWhen + optionsFilter Admin). */
export function resolveFieldChipOptions(
  field: ConfigField,
  config: Record<string, unknown>,
): string[] {
  const base = field.options ?? [];
  if (!field.optionsFilter?.optionsByValue) return base;
  const src = String(config[field.optionsFilter.field] ?? '').trim();
  if (!src) return base;
  const filtered = field.optionsFilter.optionsByValue[src];
  if (!filtered?.length) return base;
  return filtered;
}

export function resolveSectionLayout(section: ConfigSection, visibleFieldCount: number): SectionLayout {
  // 1 seul champ visible → toujours stack (évite Format coincé dans 1/3 de grid-3)
  if (visibleFieldCount <= 1) return 'stack';
  if (section.layout) return section.layout;
  if (visibleFieldCount >= 4) return 'grid-3';
  if (visibleFieldCount >= 2) return 'grid-2';
  return 'stack';
}

export function fieldGridSpanClass(field: ConfigField, config: Record<string, unknown>): string {
  // Rails chips / multi / larges = pleine largeur (style Packaging Boîte)
  if (
    field.type === 'chips'
    || field.type === 'chips_multi'
    || field.type === 'textarea'
    || field.type === 'dimensions'
    || field.type === 'color_palette'
    || field.type === 'size_qty_table'
    || field.type === 'bache_eyelets'
    || field.type === 'corner_rounding'
    || field.key === 'finitions'
  ) {
    return 'col-span-full';
  }
  // Champs « Autres » / personnalisés liés à un rail chips
  if (/_autre$|_custom$|_perso$/i.test(field.key) || isCustomOptionValue(config[field.key])) {
    return 'col-span-full';
  }
  // Format équivalent + dims L×l : côte à côte sous le rail
  if (
    field.key === 'format_eq_longueur'
    || field.key === 'format_eq_largeur'
  ) {
    return 'col-span-full sm:col-span-1';
  }
  return '';
}

export function sectionGridClass(layout: SectionLayout): string {
  switch (layout) {
    case 'grid-2':
      return 'grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2.5';
    case 'grid-3':
      /* 3 champs (L×P×H) : une ligne dès tablette, pas seulement xl */
      return 'grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-2.5';
    default:
      return 'space-y-4';
  }
}
