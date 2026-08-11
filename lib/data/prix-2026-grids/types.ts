/**
 * STUB — types PRIX 2026 (sans données tarifaires).
 */
export type Prix2026Lookup = {
  calculable: boolean;
  surDevis?: boolean;
  missingField?: string;
  sheet: string;
  articleId: string;
  unitPrice: number;
  tierLabel: string | null;
  columnLabel: string | null;
  includedFinitions?: string[];
  formula: string;
};

export type QtyTier = { min: number; max: number | null; price: number };

export function qtyTierPriceRange(_tiers: QtyTier[]): { min: number; max: number } | null {
  return null;
}

export function pickQtyTierPrice(
  _tiers: QtyTier[],
  _qtyRaw: number,
): { price: number; tierLabel: string } | null {
  return null;
}

export function parseAr(raw: unknown): number {
  const n = Number(String(raw ?? '').replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
