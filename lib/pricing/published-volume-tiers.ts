/**
 * Paliers volume unifiés — source de vérité = DiscountTier publiés (Admin).
 * Fallbacks TS uniquement si aucun palier publié (jamais écrasés au démarrage).
 */

import { IMPRESSION_SF_VOLUME_REMISES } from '@/lib/data/impression-sf-paper-tariffs';
import { IMPRESSION_SF_CANONICAL_ID } from '@/lib/pos/impression-sf-catalog';

export type VolumeDiscountTierLike = {
  minQty: number;
  maxQty: number | null;
  discountPercent: number;
  unitPrice?: number | null;
  active?: boolean;
};

/** Paliers ISF historiques → DiscountTier (discountPercent en %). */
export const DEFAULT_ISF_VOLUME_DISCOUNT_TIERS: VolumeDiscountTierLike[] =
  IMPRESSION_SF_VOLUME_REMISES.map((t) => ({
    minQty: t.min,
    maxQty: Number.isFinite(t.max) ? t.max : null,
    discountPercent: Math.round(t.rate * 10000) / 100,
    active: true,
  }));

/** Paliers génériques POS (volume-remise.ts historique). */
export const DEFAULT_GENERIC_VOLUME_DISCOUNT_TIERS: VolumeDiscountTierLike[] = [
  { minQty: 1, maxQty: 99, discountPercent: 0, active: true },
  { minQty: 100, maxQty: 499, discountPercent: 5, active: true },
  { minQty: 500, maxQty: 999, discountPercent: 10, active: true },
  { minQty: 1000, maxQty: null, discountPercent: 15, active: true },
];

let cachedIsfTiers: VolumeDiscountTierLike[] = DEFAULT_ISF_VOLUME_DISCOUNT_TIERS;
let cachedGenericTiers: VolumeDiscountTierLike[] = DEFAULT_GENERIC_VOLUME_DISCOUNT_TIERS;

export function setPublishedVolumeDiscountTiers(opts: {
  isf?: VolumeDiscountTierLike[];
  generic?: VolumeDiscountTierLike[];
}) {
  if (opts.isf?.length) cachedIsfTiers = opts.isf;
  if (opts.generic?.length) cachedGenericTiers = opts.generic;
}

export function getPublishedIsfVolumeTiers(): VolumeDiscountTierLike[] {
  return cachedIsfTiers;
}

export function getPublishedGenericVolumeTiers(): VolumeDiscountTierLike[] {
  return cachedGenericTiers;
}

export function volumeRemiseRateFromTiers(
  qty: number,
  tiers: VolumeDiscountTierLike[],
): number {
  const active = tiers.filter((t) => t.active !== false).sort((a, b) => a.minQty - b.minQty);
  if (!active.length) return 0;
  for (const t of active) {
    if (qty < t.minQty) continue;
    if (t.maxQty != null && qty > t.maxQty) continue;
    return Math.max(0, Number(t.discountPercent) || 0) / 100;
  }
  const last = active[active.length - 1];
  return last ? Math.max(0, Number(last.discountPercent) || 0) / 100 : 0;
}

export const VOLUME_TIERS_ISF_ARTICLE_ID = IMPRESSION_SF_CANONICAL_ID;
export const VOLUME_TIERS_GENERIC_ARTICLE_ID = '__volume_global__';
