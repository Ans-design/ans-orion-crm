/**
 * Prix matière — sémantique Ultra-Prompt / grille unifiée.
 * 0 n’est jamais un sentinel pour « manquant » : seul null = absent.
 *
 * Formule commerciale (catalogue articles) :
 *   Prix imprimé = Prix matière + Marge de gain + Prix consommables
 * où les consommables sont dérivés automatiquement (résidu / 0 si inconnu).
 */
export type MaterialPriceKind = 'purchase' | 'blank' | 'print';

export const MATERIAL_PRICE_LABELS: Record<MaterialPriceKind, string> = {
  purchase: 'Coût d’achat',
  blank: 'Prix matière',
  print: 'Prix imprimé',
};

export type MaterialPricingParts = {
  blank: number | null;
  marginGain: number | null;
  consumables: number;
  print: number | null;
};

/** Affichage cellule prix : « — » / « À renseigner » si absent ; jamais 0 fantôme. */
export function formatMaterialMoney(
  value: number | null | undefined,
  opts?: { unit?: string | null; editableHint?: boolean },
): string {
  if (value == null || Number.isNaN(value)) {
    return opts?.editableHint ? 'À renseigner' : '—';
  }
  const n = Number(value);
  const formatted = `${n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} Ar`;
  const unit = opts?.unit?.trim();
  return unit ? `${formatted} / ${unit}` : formatted;
}

/**
 * Prix vierge : blankSellPrice prioritaire (y compris 0).
 * Fallback maxPrice legacy uniquement si blankSellPrice est vraiment absent (undefined),
 * pas après un clear explicite (null).
 */
export function resolveBlankSellPrice(row: {
  blankSellPrice?: number | null;
  maxPrice?: number | null;
}): number | null {
  if (Object.prototype.hasOwnProperty.call(row, 'blankSellPrice')) {
    const v = row.blankSellPrice;
    if (v == null || Number.isNaN(v)) return null;
    return v;
  }
  if (row.maxPrice != null && !Number.isNaN(row.maxPrice) && row.maxPrice > 0) {
    return row.maxPrice;
  }
  return null;
}

export function resolvePrintPrice(row: { basePrintPrice?: number | null }): number | null {
  if (row.basePrintPrice == null || Number.isNaN(row.basePrintPrice)) return null;
  return row.basePrintPrice;
}

export function resolvePurchasePrice(row: { purchasePrice?: number | null }): number | null {
  if (row.purchasePrice == null || Number.isNaN(row.purchasePrice)) return null;
  return row.purchasePrice;
}

/**
 * Consommables impression (auto).
 * Résidu éventuel au-delà de la marge saisie ; 0 tant qu’aucune composition n’est figée.
 * (Ne dérive pas de targetMargin % — réservé à la marge cible commerciale.)
 */
export function resolvePrintConsumablesCost(_row: {
  blankSellPrice?: number | null;
  maxPrice?: number | null;
  basePrintPrice?: number | null;
  marginTarget?: number | null;
}): number {
  return 0;
}

/**
 * Marge de gain (Ar) = prix imprimé − prix matière − consommables.
 * Éditable : mettre à jour basePrintPrice = matière + marge + consommables.
 */
export function resolveMarginGainAr(row: {
  blankSellPrice?: number | null;
  maxPrice?: number | null;
  basePrintPrice?: number | null;
}): number | null {
  const blank = resolveBlankSellPrice(row);
  const print = resolvePrintPrice(row);
  if (blank == null || print == null) return null;
  return Math.max(0, Math.round(print - blank - resolvePrintConsumablesCost(row)));
}

/** Prix imprimé = matière + marge + consommables. */
export function computePrintPriceFromParts(
  blank: number | null | undefined,
  marginGain: number | null | undefined,
  consumables: number | null | undefined,
): number {
  return Math.max(0, Math.round((blank ?? 0) + (marginGain ?? 0) + (consumables ?? 0)));
}

export function resolveMaterialPricingParts(row: {
  blankSellPrice?: number | null;
  maxPrice?: number | null;
  basePrintPrice?: number | null;
  marginTarget?: number | null;
}): MaterialPricingParts {
  const blank = resolveBlankSellPrice(row);
  const print = resolvePrintPrice(row);
  const marginGain = resolveMarginGainAr(row);
  const consumables = resolvePrintConsumablesCost(row);
  return { blank, marginGain, consumables, print };
}

/** « Prix manquant » = prix impression absent (0 = prix réel valide). */
export function isMaterialPrintPriceMissing(row: {
  basePrintPrice?: number | null;
}): boolean {
  return resolvePrintPrice(row) == null;
}

/** Manque un prix de vente (impression ou vierge). */
export function isMaterialSellPriceMissing(row: {
  basePrintPrice?: number | null;
  blankSellPrice?: number | null;
  maxPrice?: number | null;
}): boolean {
  return isMaterialPrintPriceMissing(row) || resolveBlankSellPrice(row) == null;
}
