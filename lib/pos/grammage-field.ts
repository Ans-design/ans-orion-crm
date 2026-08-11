import type { ConfigField } from '@/lib/data/config-types';
import { filterGlossyGrammageOptions } from '@/lib/pos/glossy-grammage-policy';

/** Clés reconnues comme champ grammage (papier, textile, bâche…). */
export function isGrammageFieldKey(key: string): boolean {
  return key.startsWith('paperWeight') || key.startsWith('grammage');
}

/** Champ parent dont dépend la liste de grammages. */
export function parentFieldForGrammage(grammageKey: string): string {
  if (grammageKey === 'grammage_interieur') return 'famille_papier';
  if (grammageKey === 'grammage_couverture') {
    return 'matiere_couverture';
  }
  if (grammageKey === 'grammage_int') return 'matiere_int';
  if (grammageKey === 'grammage_couv') return 'matiere_couv';
  if (grammageKey.startsWith('paperWeight')) {
    return grammageKey.replace('paperWeight', 'paperType') || 'paperType';
  }
  if (grammageKey.startsWith('grammage_')) {
    const suffix = grammageKey.slice('grammage_'.length);
    if (suffix === 'int') return 'matiere_int';
    if (suffix === 'couv') return 'matiere_couv';
    return `matiere_${suffix}`;
  }
  return 'matiere';
}

/** Clé grammage associée quand le parent matière / support change. */
export function grammageKeyForParent(parentKey: string): string | null {
  switch (parentKey) {
    case 'famille_papier':
      return 'grammage_interieur';
    case 'matiere_couverture':
      return 'grammage_couverture';
    case 'type_support_couverture':
      return 'grammage_couverture';
    case 'matiere_int':
      return 'grammage_int';
    case 'matiere_couv':
      return 'grammage_couv';
    case 'matiere':
      return 'grammage';
    default:
      if (parentKey.startsWith('paperType')) {
        return parentKey.replace('paperType', 'paperWeight');
      }
      if (parentKey.startsWith('matiere_')) {
        return parentKey.replace('matiere_', 'grammage_');
      }
      return null;
  }
}

/** Message affiché quand aucun grammage n'est encore disponible. */
export function grammageEmptyPlaceholder(field: ConfigField): string {
  const parent = field.optionsFilter?.field;
  if (parent === 'matiere_couverture') {
    return 'Sélectionnez une matière couverture pour afficher les grammages compatibles.';
  }
  if (parent === 'type_support_couverture') {
    return 'Sélectionnez un type de support pour afficher les grammages compatibles.';
  }
  if (parent === 'famille_papier') {
    return 'Sélectionnez une famille papier pour afficher les grammages compatibles.';
  }
  if (parent === 'matiere_int') {
    return 'Sélectionnez une matière intérieur pour afficher les grammages compatibles.';
  }
  if (parent === 'matiere_couv') {
    return 'Sélectionnez une matière couverture pour afficher les grammages compatibles.';
  }
  return 'Sélectionnez une matière pour afficher les grammages compatibles.';
}

/** Résout les options grammage : catalogue stock prioritaire, puis optionsFilter. */
export function resolveGrammageOptions(
  field: ConfigField,
  config: Record<string, unknown>,
  materialWeights: Record<string, string[]>,
): string[] {
  const parentKey = parentFieldForGrammage(field.key);
  const matVal = String(config[parentKey] ?? '').trim();

  if (matVal && materialWeights[matVal]?.length) {
    const customFromFilter = field.optionsFilter?.optionsByValue?.[matVal]?.filter((o) =>
      /personnalis|autres|sur devis/i.test(o),
    ) ?? ['Grammage personnalisé'];
    const fromApi = materialWeights[matVal].filter((g) => !/personnalis/i.test(g));
    return filterGlossyGrammageOptions(matVal, [...new Set([...fromApi, ...customFromFilter])]);
  }

  if (field.optionsFilter && config) {
    const filterVal = config[field.optionsFilter.field];
    if (filterVal && field.optionsFilter.optionsByValue[filterVal as string]) {
      return filterGlossyGrammageOptions(
        String(filterVal),
        field.optionsFilter.optionsByValue[filterVal as string],
      );
    }
    return [];
  }

  return filterGlossyGrammageOptions(matVal, field.options ?? []);
}

/** true si le changement de ce champ doit réinitialiser un grammage lié. */
export function isGrammageParentKey(key: string): boolean {
  return (
    key.startsWith('paperType')
    || key.startsWith('matiere')
    || key === 'famille_papier'
    || key === 'type_support_couverture'
    || key === 'matiere_couverture'
  );
}
