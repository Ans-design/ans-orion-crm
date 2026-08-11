export type ConfigPriceTier = { max: number | null; px: number };

export type DbDiscountTier = {
  id?: string;
  minQty: number;
  maxQty: number | null;
  unitPrice: number | null;
  discountPercent?: number | null;
  active?: boolean;
};

export type AppliedTierSnapshot = {
  source: 'db_discount' | 'config_tier' | 'db_tarif';
  label: string;
  minQty: number | null;
  maxQty: number | null;
  unitPrice: number;
  tierId?: string | null;
  discountPercent?: number | null;
};

/** Sélection palier prix par quantité — tiers code / tarifs */
export function pickTierUnitPrice(
  tiers: ConfigPriceTier[],
  qty: number,
  fallback = 0,
): number {
  const applied = pickAppliedConfigTier(tiers, qty, fallback);
  return applied?.unitPrice ?? fallback;
}

/** Palier config (max/px) appliqué pour une quantité */
export function pickAppliedConfigTier(
  tiers: ConfigPriceTier[],
  qty: number,
  fallback = 0,
): AppliedTierSnapshot | null {
  if (!tiers.length) return null;
  let prevMax = 0;
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    if (tier.max === null || qty <= tier.max) {
      const minQty = i === 0 ? 1 : prevMax + 1;
      return {
        source: 'config_tier',
        label: tier.max == null ? `≥ ${minQty}` : `${minQty}–${tier.max}`,
        minQty,
        maxQty: tier.max,
        unitPrice: tier.px,
      };
    }
    prevMax = tier.max;
  }
  const last = tiers[tiers.length - 1];
  if (!last) return null;
  const minQty = tiers.length === 1 ? 1 : (tiers[tiers.length - 2]?.max ?? 0) + 1;
  return {
    source: 'config_tier',
    label: last.max == null ? `≥ ${minQty}` : `${minQty}–${last.max}`,
    minQty,
    maxQty: last.max,
    unitPrice: last.px,
  };
}

/** Palier DB (minQty/maxQty) appliqué pour une quantité */
export function pickAppliedDbTier(
  tiers: DbDiscountTier[],
  qty: number,
  fallback = 0,
): AppliedTierSnapshot | null {
  const active = tiers.filter((t) => t.active !== false).sort((a, b) => a.minQty - b.minQty);
  if (!active.length) return null;

  const resolveUnit = (t: DbDiscountTier): number => {
    if (t.unitPrice != null && Number.isFinite(t.unitPrice) && t.unitPrice >= 0) {
      return t.unitPrice;
    }
    const pct = Number(t.discountPercent) || 0;
    if (pct > 0 && fallback > 0) {
      return Math.round(fallback * (1 - pct / 100));
    }
    return fallback;
  };

  for (const t of active) {
    if (qty < t.minQty) continue;
    if (t.maxQty != null && qty > t.maxQty) continue;
    const label =
      t.maxQty == null
        ? `≥ ${t.minQty}`
        : t.minQty === t.maxQty
          ? `${t.minQty}`
          : `${t.minQty}–${t.maxQty}`;
    return {
      source: 'db_discount',
      label,
      minQty: t.minQty,
      maxQty: t.maxQty,
      unitPrice: resolveUnit(t),
      tierId: t.id ?? null,
      discountPercent: t.discountPercent ?? null,
    };
  }
  const last = active[active.length - 1];
  if (!last) return null;
  return {
    source: 'db_discount',
    label: last.maxQty == null ? `≥ ${last.minQty}` : `${last.minQty}–${last.maxQty}`,
    minQty: last.minQty,
    maxQty: last.maxQty,
    unitPrice: resolveUnit(last),
    tierId: last.id ?? null,
    discountPercent: last.discountPercent ?? null,
  };
}

export function pickDbTierUnitPrice(
  tiers: DbDiscountTier[],
  qty: number,
  fallback = 0,
): number {
  return pickAppliedDbTier(tiers, qty, fallback)?.unitPrice ?? fallback;
}
