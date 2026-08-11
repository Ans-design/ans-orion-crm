/** Presets conversions unités commerciales → standard (imprimerie) */
export const STOCK_UNIT_PRESETS: Record<string, { unitStandard: string; conversionFactor: number; label: string }> = {
  rame_500: { unitStandard: 'feuille', conversionFactor: 500, label: '1 rame = 500 feuilles' },
  rame_125: { unitStandard: 'feuille', conversionFactor: 125, label: '1 rame = 125 feuilles' },
  rame_250: { unitStandard: 'feuille', conversionFactor: 250, label: '1 rame = 250 feuilles' },
  paquet_50: { unitStandard: 'pcs', conversionFactor: 50, label: '1 paquet = 50 pcs' },
  paquet_100: { unitStandard: 'pcs', conversionFactor: 100, label: '1 paquet = 100 pcs' },
  rouleau_80m2: { unitStandard: 'm²', conversionFactor: 80, label: '1 rouleau = 80 m²' },
  rouleau_60m2: { unitStandard: 'm²', conversionFactor: 60, label: '1 rouleau = 60 m²' },
  carton_12: { unitStandard: 'pcs', conversionFactor: 12, label: '1 carton = 12 pcs' },
  lot_50: { unitStandard: 'pcs', conversionFactor: 50, label: '1 lot = 50 pcs' },
};

export const STOCK_UNIT_DISPLAY_OPTIONS = [
  'rame', 'paquet', 'rouleau', 'plaque', 'carton', 'lot', 'pcs', 'feuille',
  'm', 'cm', 'm²', 'litre', 'kg', 'forfait',
] as const;

export function resolvePresetConversion(presetId: string) {
  return STOCK_UNIT_PRESETS[presetId] ?? null;
}

/** Quantité stock à ajouter depuis une ligne achat */
export function purchaseQtyToStockQty(params: {
  purchaseQty: number;
  purchaseUnit?: string | null;
  lineConversionFactor?: number | null;
  stockUnitDisplay?: string | null;
  stockConversionFactor?: number | null;
}): number {
  const { purchaseQty, purchaseUnit, lineConversionFactor, stockUnitDisplay, stockConversionFactor } = params;
  if (purchaseQty <= 0) return 0;

  const sameUnit =
    !purchaseUnit ||
    !stockUnitDisplay ||
    purchaseUnit.toLowerCase() === stockUnitDisplay.toLowerCase();

  if (sameUnit) return purchaseQty;

  const factor = lineConversionFactor ?? stockConversionFactor;
  if (factor != null && factor > 0) return Math.round(purchaseQty * factor * 100) / 100;

  return purchaseQty;
}

export function conversionLabel(unitDisplay: string | null, factor: number | null, unitStandard: string | null): string | null {
  if (!unitDisplay || !factor || !unitStandard) return null;
  return `1 ${unitDisplay} = ${factor} ${unitStandard}`;
}
