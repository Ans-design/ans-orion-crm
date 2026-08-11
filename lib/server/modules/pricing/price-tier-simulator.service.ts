import type { TierMode, TierSimulationLine, TierTableRow } from '@/lib/server/modules/backoffice-v2/admin-backoffice-tiers.types';
import { formatTierRange } from '@/lib/server/modules/backoffice-v2/admin-backoffice-tiers.catalogue';

function sampleQtyForTier(t: TierTableRow, qtyMin: number | null): number {
  if (t.maxQty != null) return Math.max(t.minQty, Math.min(t.maxQty, t.maxQty));
  return Math.max(t.minQty, qtyMin ?? t.minQty, t.minQty === 1 ? 10 : t.minQty);
}

export function simulateTierLines(
  tiers: TierTableRow[],
  tierMode: TierMode,
  prixBase: number | null,
  saleUnit: string,
  qtyMin: number | null,
): TierSimulationLine[] {
  const active = tiers.filter((t) => t.active).sort((a, b) => a.minQty - b.minQty);
  const base = prixBase ?? 0;

  return active.map((t) => {
    const qty = sampleQtyForTier(t, qtyMin);
    let unitPrice = base;
    if (tierMode === 'unit_price' && t.unitPrice != null) {
      unitPrice = t.unitPrice;
    } else if (tierMode === 'percent') {
      unitPrice = Math.round(base * (1 - (t.discountPercent ?? 0) / 100));
    } else if (tierMode === 'coefficient' && t.unitPrice != null) {
      unitPrice = Math.round(base * t.unitPrice);
    } else if (t.unitPrice != null) {
      unitPrice = t.unitPrice;
    }
    const label = formatTierRange(t.minQty, t.maxQty, saleUnit);
    return {
      tierId: t.id,
      label,
      sampleQty: qty,
      unitPrice,
      lineTotal: unitPrice * qty,
      isHighlighted: false,
    };
  });
}

export function pickTierForQty(
  tiers: TierTableRow[],
  tierMode: TierMode,
  prixBase: number | null,
  qty: number,
): { tier: TierTableRow; unitPrice: number; label: string } | null {
  const active = tiers.filter((t) => t.active).sort((a, b) => a.minQty - b.minQty);
  const base = prixBase ?? 0;
  for (const t of active) {
    if (qty < t.minQty) continue;
    if (t.maxQty != null && qty > t.maxQty) continue;
    let unitPrice = base;
    if (tierMode === 'unit_price' && t.unitPrice != null) unitPrice = t.unitPrice;
    else if (tierMode === 'percent') unitPrice = Math.round(base * (1 - (t.discountPercent ?? 0) / 100));
    else if (t.unitPrice != null) unitPrice = t.unitPrice;
    return { tier: t, unitPrice, label: formatTierRange(t.minQty, t.maxQty, '') };
  }
  return null;
}
