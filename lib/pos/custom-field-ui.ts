import type { ConfigField, ProductConfig } from '@/lib/data/config-types';
import { productHasDedicatedDimensionFields } from '@/lib/pos/format-personnalise-policy';

/** Type de saisie affiché quand l'utilisateur choisit « Autres » / « Personnalisé ». */
export type CustomFieldKind =
  | 'dimension'
  | 'quantity'
  | 'grammage'
  | 'material'
  | 'finish'
  | 'technology'
  | 'color'
  | 'binding'
  | 'text';

export function isCustomOptionValue(value: unknown): boolean {
  if (typeof value !== 'string' || !value.trim()) return false;
  const v = value.toLowerCase().trim();
  return (
    v.includes('personnalis')
    || v.includes('sur mesure')
    || v.includes('sur devis')
    || v === 'autres'
    || v === 'other'
  );
}

/** Déduit le type de saisie depuis la clé du champ (ou customInput explicite). */
export function resolveCustomFieldKind(field: ConfigField): CustomFieldKind {
  if (field.customInput) return field.customInput;

  const k = field.key.toLowerCase();

  if (
    k === 'format'
    || k === 'format_marquage'
    || k === 'diametre'
    || k.endsWith('_marquage')
    || k === 'dimension'
    || k === 'taille'
    || k.startsWith('dim')
    || k === 'taille'
  ) {
    return 'dimension';
  }

  if (
    k.includes('feuillet')
    || k.includes('feuille')
    || k === 'nb_pages'
    || k === 'nombre_feuilles'
    || k === 'pages'
    || k === 'souches'
    || k === 'propositions'
    || k === 'nb_perforations'
  ) {
    return 'quantity';
  }

  if (k.startsWith('grammage') || k.startsWith('paperweight')) {
    return 'grammage';
  }

  if (
    k.startsWith('matiere')
    || k === 'famille_papier'
    || k.includes('papier')
    || k.includes('support')
    || k.startsWith('papertype')
    || k === 'couverture'
  ) {
    return 'material';
  }

  if (k.startsWith('finition') || k.includes('pellicul')) {
    return 'finish';
  }

  if (k.startsWith('techno')) {
    return 'technology';
  }

  if (k.startsWith('couleur') || k === 'couleur_impression') {
    return 'color';
  }

  if (k.includes('reliure') || k === 'accroche') {
    return 'binding';
  }

  return 'text';
}

/** Dimensions L × l — masqué si l’article a déjà longueur + largeur dédiés. */
export function shouldShowDimensionInputs(
  field: ConfigField,
  value: unknown,
  opts?: { skipDynamicDims?: boolean; productConfig?: ProductConfig | null; articleId?: string },
): boolean {
  if (opts?.skipDynamicDims) return false;
  if (productHasDedicatedDimensionFields(opts?.productConfig)) return false;
  if (!isCustomOptionValue(value)) return false;
  return resolveCustomFieldKind(field) === 'dimension';
}

/** Masque le textarea « Format » / « Autres précisions » redondant quand L×l numériques existent. */
export function shouldHideDimensionDetailTextarea(
  field: ConfigField,
  productConfig: ProductConfig | null | undefined,
): boolean {
  if (!productHasDedicatedDimensionFields(productConfig)) return false;
  return resolveCustomFieldKind(field) === 'dimension';
}

/** Bloc texte format personnalisé — jamais affiché (dimensions numériques uniquement). */
export function shouldShowCustomDimensionTextBlock(
  field: ConfigField,
  value: unknown,
  productConfig: ProductConfig | null | undefined,
): boolean {
  if (resolveCustomFieldKind(field) !== 'dimension') return true;
  if (!isCustomOptionValue(value)) return true;
  return !productHasDedicatedDimensionFields(productConfig);
}

/** Bloc « Autres / personnalisé » (texte) — masqué si panneau L×l numérique actif. */
export function shouldShowTypedCustomBlock(
  field: ConfigField,
  value: unknown,
  opts?: {
    skipFormatCustomText?: boolean;
    skipDynamicDims?: boolean;
    productConfig?: ProductConfig | null;
    articleId?: string;
    useCustomFormatPanel?: boolean;
  },
): boolean {
  if (opts?.skipFormatCustomText) return false;
  if (!isCustomOptionValue(value)) return false;

  const kind = resolveCustomFieldKind(field);
  if (kind === 'dimension') {
    if (opts?.useCustomFormatPanel) return false;
    if (productHasDedicatedDimensionFields(opts?.productConfig)) return false;
    if (
      shouldShowDimensionInputs(field, value, {
        skipDynamicDims: opts?.skipDynamicDims,
        productConfig: opts?.productConfig,
        articleId: opts?.articleId,
      })
    ) {
      return false;
    }
  }

  return true;
}

export type CustomFieldUiCopy = {
  title: string;
  inputLabel: string;
  inputPlaceholder: string;
  detailPlaceholder: string;
  suffix?: string;
};

export function customFieldUiCopy(kind: CustomFieldKind, field: ConfigField): CustomFieldUiCopy {
  const label = field.label?.toLowerCase() ?? 'option';

  switch (kind) {
    case 'dimension':
      return {
        title: '📏 Dimensions personnalisées',
        inputLabel: 'Format',
        inputPlaceholder: '',
        detailPlaceholder: 'Autres précisions : forme, contraintes de production…',
      };
    case 'quantity':
      return {
        title: '📄 Nombre personnalisé',
        inputLabel: field.key.includes('feuillet') || field.key.includes('feuille')
          ? 'Nombre de feuilles'
          : 'Nombre de pages',
        inputPlaceholder: 'Ex. : 120 feuilles',
        detailPlaceholder: 'Autres précisions : pagination, feuilles détachables, contraintes…',
        suffix: field.key.includes('feuillet') || field.key.includes('feuille') ? 'feuilles' : 'pages',
      };
    case 'grammage':
      return {
        title: '⚖️ Grammage personnalisé',
        inputLabel: 'Grammage souhaité',
        inputPlaceholder: 'Ex. : 120, 200, 400',
        detailPlaceholder: 'Précisions sur le support ou la référence papier…',
        suffix: 'g/m²',
      };
    case 'material':
      return {
        title: '📃 Matière / support souhaité',
        inputLabel: 'Matière ou support',
        inputPlaceholder: 'Ex. : papier texturé ivoire, papier recyclé, support client…',
        detailPlaceholder: 'Référence fournisseur, contraintes d\'impression…',
      };
    case 'finish':
      return {
        title: '✨ Finition souhaitée',
        inputLabel: 'Finition',
        inputPlaceholder: 'Ex. : coins arrondis + vernis sélectif, découpe spéciale…',
        detailPlaceholder: 'Détails techniques ou visuels…',
      };
    case 'technology':
      return {
        title: '⚙️ Technologie souhaitée',
        inputLabel: 'Technologie d\'impression',
        inputPlaceholder: 'Ex. : sérigraphie, sublimation, impression spéciale…',
        detailPlaceholder: 'Contraintes machine, rendu attendu…',
      };
    case 'color':
      return {
        title: '🎨 Couleur personnalisée',
        inputLabel: 'Couleur / référence',
        inputPlaceholder: 'Ex. : Pantone 186 C, CMJN, référence client…',
        detailPlaceholder: 'Nuancier, échantillon, contraintes colorimétriques…',
      };
    case 'binding':
      return {
        title: '📎 Reliure / accroche souhaitée',
        inputLabel: field.key.includes('accroche') ? 'Type d\'accroche' : 'Type de reliure',
        inputPlaceholder: 'Ex. : Wire-O noir, spirale blanche, reliure cousue…',
        detailPlaceholder: 'Contraintes de production ou finition…',
      };
    default:
      return {
        title: `✏️ ${field.label || 'Option'} personnalisée`,
        inputLabel: field.label || 'Précision',
        inputPlaceholder: `Décrivez votre ${label} souhaité…`,
        detailPlaceholder: 'Autres précisions utiles à la production…',
      };
  }
}

/** Articles autorisés à afficher la profondeur (emballage 3D). */
export function allowsDimensionDepth(articleId: string, fieldKey: string): boolean {
  return articleId === 'pkg-boite' && (fieldKey === 'format' || fieldKey === 'dimension');
}
