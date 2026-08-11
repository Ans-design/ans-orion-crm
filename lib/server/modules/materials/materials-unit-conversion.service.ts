/** Unités commerciales et standard — Matières DB */
export const MATERIAL_UNIT_DISPLAY_OPTIONS = [
  'rame',
  'paquet',
  'rouleau',
  'feuille',
  'plaque',
  'carton',
  'lot',
  'pcs',
  'pièce',
  'm',
  'cm',
  'm²',
  'kg',
  'litre',
  'forfait',
] as const;

export const MATERIAL_UNIT_STANDARD_OPTIONS = [
  'feuille',
  'pcs',
  'm',
  'm²',
  'cm',
  'cm²',
  'kg',
  'litre',
] as const;

export type UnitConversionInput = {
  unitDisplay?: string | null;
  unitStandard?: string | null;
  conversionFactor?: number | null;
  widthMm?: number | null;
  heightMm?: number | null;
  lengthM?: number | null;
  widthM?: number | null;
};

export function computeSurfaceM2(widthM: number, lengthM: number): number {
  return Math.round(widthM * lengthM * 10000) / 10000;
}

export function resolveConversionFactor(input: UnitConversionInput): number | null {
  if (input.conversionFactor != null && input.conversionFactor > 0) return input.conversionFactor;

  const wM = input.widthM ?? (input.widthMm != null ? input.widthMm / 1000 : null);
  const lM = input.lengthM ?? (input.heightMm != null ? input.heightMm / 1000 : null);
  if (wM != null && lM != null && wM > 0 && lM > 0) {
    return computeSurfaceM2(wM, lM);
  }
  return null;
}

export function convertToStandardUnits(displayQty: number, factor: number | null): number | null {
  if (factor == null || factor <= 0) return null;
  return Math.round(displayQty * factor * 100) / 100;
}

export function formatStockDisplay(
  displayQty: number,
  unitDisplay: string | null,
  standardQty: number | null,
  unitStandard: string | null,
): string {
  const u = unitDisplay ?? 'unité';
  const base = `${displayQty} ${u}`;
  if (standardQty != null && unitStandard) {
    return `${base} / ${standardQty} ${unitStandard}`;
  }
  return base;
}

export function detectConversionAnomalies(input: UnitConversionInput): string[] {
  const anomalies: string[] = [];
  if (!input.unitDisplay?.trim()) anomalies.push('Unité affichée manquante');
  if (!input.unitStandard?.trim()) anomalies.push('Unité standard manquante');
  const factor = resolveConversionFactor(input);
  if (factor == null) anomalies.push('Conversion manquante');
  if (input.unitDisplay === 'rouleau' && factor == null) {
    anomalies.push('Rouleau sans largeur/longueur/surface');
  }
  if (input.unitDisplay === 'rame' && (factor == null || factor <= 0)) {
    anomalies.push('Rame sans nombre de feuilles');
  }
  return anomalies;
}
