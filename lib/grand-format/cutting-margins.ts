/**
 * Marges découpe / risque / chute — formats standards Grand Format (A0→A5).
 * Plus le format est petit, plus la marge % est élevée.
 * Modifiable en Admin (runtime) ; seed code = valeurs métier.
 */

export type GfCuttingMarginRule = {
  formatCode: string;
  /** Ratio surface vs A0 (A0=1, A1=1/2, …). */
  surfaceRatio: number;
  /** Pourcentage de marge découpe. */
  marginPercent: number;
  motif: string;
  active: boolean;
  comment?: string;
};

/** Valeurs par défaut métier (Admin peut surcharger). */
export const DEFAULT_GF_CUTTING_MARGINS: GfCuttingMarginRule[] = [
  { formatCode: 'A0', surfaceRatio: 1, marginPercent: 0, motif: 'Format de référence', active: true },
  { formatCode: 'A1', surfaceRatio: 1 / 2, marginPercent: 5, motif: 'Découpe / risque / chute', active: true },
  { formatCode: 'A2', surfaceRatio: 1 / 4, marginPercent: 10, motif: 'Découpe / risque / chute', active: true },
  { formatCode: 'A3', surfaceRatio: 1 / 8, marginPercent: 15, motif: 'Découpe / risque / chute', active: true },
  { formatCode: 'A4', surfaceRatio: 1 / 16, marginPercent: 20, motif: 'Découpe / risque / chute', active: true },
  { formatCode: 'A5', surfaceRatio: 1 / 32, marginPercent: 25, motif: 'Découpe / risque / chute', active: true },
];

let runtimeMargins: GfCuttingMarginRule[] | null = null;

export function setGfCuttingMarginsRuntime(rules: GfCuttingMarginRule[] | null): void {
  runtimeMargins = rules?.length ? rules : null;
}

export function getGfCuttingMargins(): GfCuttingMarginRule[] {
  return (runtimeMargins ?? DEFAULT_GF_CUTTING_MARGINS).filter((r) => r.active !== false);
}

export function findGfCuttingMargin(
  formatCode: string,
  rules: GfCuttingMarginRule[] = getGfCuttingMargins(),
): GfCuttingMarginRule | null {
  const key = String(formatCode ?? '').trim().toUpperCase();
  if (!key) return null;
  return rules.find((r) => r.formatCode.toUpperCase() === key) ?? null;
}

/** Extrait A0–A5 depuis un libellé format POS. */
export function extractGfStandardFormatCode(formatRaw: string): string | null {
  const s = String(formatRaw ?? '').trim();
  if (!s || /personnalis/i.test(s)) return null;
  if (/A3\+/i.test(s) || /SRA3/i.test(s)) return null; // hors table découpe A0–A5
  const m = s.match(/\b(A[0-5])\b/i);
  return m ? m[1]!.toUpperCase() : null;
}

export type GfCuttingMarginApplication = {
  formatCode: string;
  surfaceRatio: number;
  marginPercent: number;
  basePrice: number;
  supplement: number;
  finalPrice: number;
  motif: string;
};

/**
 * Prix format standard depuis prix A0 (≈ prix m²) + marge découpe.
 * A1 = A0/2 + 5 %, etc.
 */
export function applyGfCuttingMarginToA0Price(
  prixA0OrM2: number,
  formatCode: string,
  rules: GfCuttingMarginRule[] = getGfCuttingMargins(),
): GfCuttingMarginApplication | null {
  if (!(prixA0OrM2 > 0)) return null;
  const rule = findGfCuttingMargin(formatCode, rules);
  if (!rule) return null;
  const basePrice = prixA0OrM2 * rule.surfaceRatio;
  const supplement = basePrice * (rule.marginPercent / 100);
  const finalPrice = Math.round(basePrice + supplement);
  return {
    formatCode: rule.formatCode,
    surfaceRatio: rule.surfaceRatio,
    marginPercent: rule.marginPercent,
    basePrice: Math.round(basePrice * 100) / 100,
    supplement: Math.round(supplement * 100) / 100,
    finalPrice,
    motif: rule.motif,
  };
}

/**
 * Marge découpe sur un prix déjà calculé (surface × m²), si format standard.
 * Pour formats perso : null (pas de marge A-series).
 */
export function applyGfCuttingMarginToUnitPrice(
  unitPrice: number,
  formatRaw: string,
  rules: GfCuttingMarginRule[] = getGfCuttingMargins(),
): GfCuttingMarginApplication | null {
  const code = extractGfStandardFormatCode(formatRaw);
  if (!code || !(unitPrice > 0)) return null;
  const rule = findGfCuttingMargin(code, rules);
  if (!rule || rule.marginPercent <= 0) {
    if (!rule) return null;
    return {
      formatCode: code,
      surfaceRatio: rule.surfaceRatio,
      marginPercent: 0,
      basePrice: unitPrice,
      supplement: 0,
      finalPrice: Math.round(unitPrice),
      motif: rule.motif,
    };
  }
  const supplement = unitPrice * (rule.marginPercent / 100);
  return {
    formatCode: code,
    surfaceRatio: rule.surfaceRatio,
    marginPercent: rule.marginPercent,
    basePrice: unitPrice,
    supplement: Math.round(supplement * 100) / 100,
    finalPrice: Math.round(unitPrice + supplement),
    motif: rule.motif,
  };
}
