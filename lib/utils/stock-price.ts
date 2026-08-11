export function computeMarginPct(
  salePrice: number | null | undefined,
  unitCost: number | null | undefined,
): number | null {
  if (salePrice == null || unitCost == null || salePrice <= 0) return null;
  return Math.round(((salePrice - unitCost) / salePrice) * 10000) / 100;
}

export function computeNetBenefit(
  salePrice: number | null | undefined,
  unitCost: number | null | undefined,
): number | null {
  if (salePrice == null || unitCost == null) return null;
  return Math.round((salePrice - unitCost) * 100) / 100;
}

export function standardQuantity(
  displayQty: number,
  conversionFactor: number | null | undefined,
): number | null {
  if (conversionFactor == null || conversionFactor <= 0) return null;
  return Math.round(displayQty * conversionFactor * 100) / 100;
}
