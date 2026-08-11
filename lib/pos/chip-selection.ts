import type { ConfigField, ProductConfig } from '@/lib/data/config-types';

export type SelectionMode =
  | 'single'
  | 'multiple'
  | 'multipleExact'
  | 'multipleMinMax'
  | 'quantity'
  | 'text'
  | 'number'
  | 'conditional';

/** Déduit le mode de sélection depuis le type de champ ou la config explicite. */
export function getSelectionMode(field: ConfigField): SelectionMode {
  if (field.selectionMode) return field.selectionMode;
  if (field.type === 'chips_multi') return 'multiple';
  if (field.type === 'number') return 'quantity';
  if (field.type === 'textarea') return 'text';
  if (field.type === 'chips') return 'single';
  return 'single';
}

function clearFieldKeys(config: Record<string, unknown>, field: ConfigField): Record<string, unknown> {
  const next = { ...config };
  if (field.type === 'chips_multi') next[field.key] = [];
  else if (field.type === 'size_qty_table') next[field.key] = {};
  else next[field.key] = '';
  delete next[`${field.key}_custom_detail`];
  delete next[`${field.key}_custom_number`];
  delete next[`${field.key}_custom_text`];
  delete next[`${field.key}_largeur`];
  delete next[`${field.key}_hauteur`];
  delete next[`${field.key}_profondeur`];
  return next;
}

/** Vide les champs masqués (showWhen non satisfait). */
export function clearHiddenFieldValues(
  config: Record<string, unknown>,
  productConfig: ProductConfig | null,
): Record<string, unknown> {
  if (!productConfig) return config;
  let next = { ...config };

  for (const section of productConfig.sections) {
    const sectionHidden =
      section.posHidden ||
      (section.showWhen &&
      !section.showWhen.values.includes(String(next[section.showWhen.field] ?? '')));

    for (const field of section.fields) {
      const fieldHidden =
        field.posHidden ||
        (field.showWhen &&
        !field.showWhen.values.includes(String(next[field.showWhen.field] ?? '')));

      if (sectionHidden || fieldHidden) {
        next = clearFieldKeys(next, field);
      }
    }
  }

  return next;
}

const MATIERE_GRAMMAGE: Record<string, string> = {
  matiere: 'grammage',
  matiere_int: 'grammage_int',
  matiere_couv: 'grammage_couv',
  famille_papier: 'grammage_interieur',
  matiere_couverture: 'grammage_couverture',
  type_support_couverture: 'grammage_couverture',
};

function isMaterialParentKey(key: string): boolean {
  return key in MATIERE_GRAMMAGE;
}

/** Après désélection matière : vider grammage lié. */
export function clearMaterialDependents(
  config: Record<string, unknown>,
  matiereKey: string,
): Record<string, unknown> {
  const next = { ...config };
  const grammageKey = MATIERE_GRAMMAGE[matiereKey];
  if (grammageKey) next[grammageKey] = '';

  const suffix = matiereKey.replace('matiere', '');
  const paperTypeKey = matiereKey === 'matiere' ? 'paperType' : `paperType${suffix}`;
  const paperWeightKey = matiereKey === 'matiere' ? 'paperWeight' : `paperWeight${suffix}`;
  if (matiereKey.startsWith('matiere') || matiereKey === 'matiere') {
    if (next[paperWeightKey] !== undefined) next[paperWeightKey] = '';
  }
  if (next[matiereKey] === '' || next[matiereKey] == null) {
    if (grammageKey) next[grammageKey] = '';
  }
  return next;
}

/** Si une palette filtrée ne contient plus la couleur courante → reset (défaut ou 1ʳᵉ teinte). */
export function syncPaletteFilterDependents(
  config: Record<string, unknown>,
  productConfig: ProductConfig | null,
  changedFieldKey: string,
): Record<string, unknown> {
  if (!productConfig) return config;
  let next = { ...config };
  const parentVal = String(next[changedFieldKey] ?? '').trim();

  for (const section of productConfig.sections) {
    for (const field of section.fields) {
      if (field.type !== 'color_palette' || field.paletteFilter?.field !== changedFieldKey) continue;
      const palettes = field.paletteFilter.palettes;
      const palette = (parentVal && palettes[parentVal]) || Object.values(palettes)[0] || field.palette || [];
      const labels = new Set(palette.map((c) => c.label));
      const current = String(next[field.key] ?? '').trim();
      if (current && labels.has(current)) continue;
      const fallback =
        (typeof field.default === 'string' && labels.has(field.default) ? field.default : null)
        ?? palette[0]?.label
        ?? '';
      next[field.key] = fallback;
    }
  }
  return next;
}

/**
 * Clic centralisé sur une chip — toggle single, multiple, exact, min/max.
 * Retourne la nouvelle config (sans effets matière/grammage externes).
 */
export function applyChipSelection(
  config: Record<string, unknown>,
  field: ConfigField,
  optionLabel: string,
  productConfig: ProductConfig | null,
): Record<string, unknown> {
  const mode = getSelectionMode(field);
  const key = field.key;
  let next = { ...config };

  if (mode === 'single') {
    const current = next[key];
    if (current === optionLabel) {
      next[key] = '';
      next = clearMaterialDependents(next, key);
      return clearHiddenFieldValues(next, productConfig);
    }
    if (isMaterialParentKey(key)) {
      next = clearMaterialDependents(next, key);
    }
    next[key] = optionLabel;
    next = syncPaletteFilterDependents(next, productConfig, key);
    return next;
  }

  const current = Array.isArray(next[key]) ? [...(next[key] as string[])] : [];

  if (current.includes(optionLabel)) {
    next[key] = current.filter((o) => o !== optionLabel);
    return next;
  }

  if (optionLabel === 'Aucune' || optionLabel === 'Sans finition') {
    next[key] = [];
    return next;
  }

  const withoutNone = current.filter((o) => o !== 'Aucune' && o !== 'Sans finition');

  if (mode === 'multipleExact') {
    const exact = field.exactSelections ?? field.minSelections ?? 1;
    if (withoutNone.length >= exact) return config;
    next[key] = [...withoutNone, optionLabel];
    return next;
  }

  if (mode === 'multipleMinMax') {
    const max = field.maxSelections ?? field.options?.length ?? 99;
    if (withoutNone.length >= max) return config;
    next[key] = [...withoutNone, optionLabel];
    return next;
  }

  // multiple libre
  next[key] = [...withoutNone, optionLabel];
  return next;
}

export function isMultipleSelectionComplete(field: ConfigField, val: unknown): boolean {const selected = Array.isArray(val) ? val : [];
  const mode = getSelectionMode(field);

  if (mode === 'multipleExact') {
    const exact = field.exactSelections ?? field.minSelections ?? 1;
    return selected.length === exact;
  }
  if (mode === 'multipleMinMax') {
    const min = field.minSelections ?? 1;
    const max = field.maxSelections ?? field.options?.length ?? 99;
    return selected.length >= min && selected.length <= max;
  }
  if (mode === 'multiple') {
    if (field.required === false) return true;
    return selected.length > 0;
  }
  return selected.length > 0;
}

/** Compteur affiché sous les chips multiples — ex. « 2/3 sélectionnés » */
export function formatMultiSelectionProgress(field: ConfigField, selected: string[]): string | null {
  const mode = getSelectionMode(field);
  const n = selected.length;

  if (mode === 'multipleExact') {
    const exact = field.exactSelections ?? field.minSelections ?? 1;
    return `${n}/${exact} sélectionné${exact > 1 ? 's' : ''}`;
  }
  if (mode === 'multipleMinMax') {
    const max = field.maxSelections;
    const min = field.minSelections ?? 0;
    if (max) return `${n}/${max} sélectionné${max > 1 ? 's' : ''}`;
    if (min > 0) return `${n} sélectionné${n !== 1 ? 's' : ''} (min. ${min})`;
  }
  if (mode === 'multiple' && n > 0) {
    return `${n} sélectionné${n > 1 ? 's' : ''}`;
  }
  return null;
}
