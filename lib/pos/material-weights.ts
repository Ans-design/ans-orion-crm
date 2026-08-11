import type { MaterialWithGrammages } from '@/lib/services/material-catalog-service';

/** Construit matière → grammages depuis le catalogue DB */
export function buildWeightsByType(materials: MaterialWithGrammages[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const m of materials) {
    if (!m.actif || m.grammages.length === 0) continue;
    map[m.label] = m.grammages;
    map[m.key] = m.grammages;
  }
  return map;
}

/** Labels matières actives (petit format + carte) pour chips matière */
export function printMaterialLabels(materials: MaterialWithGrammages[]): string[] {
  return materials
    .filter((m) => m.actif && (m.family === 'Petit format' || m.family === 'Carte'))
    .map((m) => m.label);
}

import { parentFieldForGrammage } from '@/lib/pos/grammage-field';

/** Résout le champ matière lié à un champ grammage */
export function materialFieldForGrammage(grammageKey: string): string {
  return parentFieldForGrammage(grammageKey);
}

export function grammageOptionsForConfig(
  grammageKey: string,
  config: Record<string, unknown>,
  weightsByType: Record<string, string[]>,
  fieldOptions?: string[],
): string[] {
  const matField = materialFieldForGrammage(grammageKey);
  const matVal = String(config[matField] ?? '').trim();
  if (matVal && weightsByType[matVal]?.length) {
    return weightsByType[matVal];
  }
  return fieldOptions ?? [];
}
