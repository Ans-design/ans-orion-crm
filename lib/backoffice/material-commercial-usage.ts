/**
 * Usage commercial d’une matière (Ultra-Prompt §12).
 * Remplace l’interprétation ambiguë du seul booléen « Visible POS ».
 * Dérivé des flags existants — pas de nouvelle colonne requise.
 */

export type MaterialCommercialUsageId =
  | 'production_only'
  | 'used_by_pos_products'
  | 'sold_direct'
  | 'unused'
  | 'to_verify';

export type MaterialCommercialUsageInput = {
  active: boolean;
  archived?: boolean;
  visiblePOS: boolean;
  impactsStock?: boolean;
  impactsPrice?: boolean;
  blankSellPrice?: number | null;
  linkedArticlesCount?: number;
  anomaliesCount?: number;
};

export const MATERIAL_COMMERCIAL_USAGE_LABELS: Record<MaterialCommercialUsageId, string> = {
  production_only: 'Production uniquement',
  used_by_pos_products: 'Utilisée par des produits POS',
  sold_direct: 'Vendue directement',
  unused: 'Non utilisée',
  to_verify: 'À vérifier',
};

export function resolveMaterialCommercialUsage(
  input: MaterialCommercialUsageInput,
): MaterialCommercialUsageId {
  if (input.archived || !input.active) return 'unused';
  if ((input.anomaliesCount ?? 0) > 0 && !input.visiblePOS) return 'to_verify';
  if (
    input.visiblePOS
    && input.blankSellPrice != null
    && input.blankSellPrice > 0
    && (input.linkedArticlesCount ?? 0) === 0
  ) {
    return 'sold_direct';
  }
  if (input.visiblePOS || (input.linkedArticlesCount ?? 0) > 0) {
    return 'used_by_pos_products';
  }
  if (input.impactsStock !== false) return 'production_only';
  return 'to_verify';
}

/** Mappe un usage métier vers flags persistés (visiblePos / impactsStock). */
export function commercialUsageToFlags(usage: MaterialCommercialUsageId): {
  visiblePos: boolean;
  impactsStock: boolean;
  active: boolean;
} {
  switch (usage) {
    case 'production_only':
      return { visiblePos: false, impactsStock: true, active: true };
    case 'used_by_pos_products':
      return { visiblePos: true, impactsStock: true, active: true };
    case 'sold_direct':
      return { visiblePos: true, impactsStock: true, active: true };
    case 'unused':
      return { visiblePos: false, impactsStock: false, active: false };
    case 'to_verify':
    default:
      return { visiblePos: false, impactsStock: true, active: true };
  }
}
