/** Remise volume POS / calculatePrice — paliers unifiés via DiscountTier publiés. */

import {
  getPublishedGenericVolumeTiers,
  volumeRemiseRateFromTiers,
  type VolumeDiscountTierLike,
} from '@/lib/pricing/published-volume-tiers';

export function volumeRemiseRate(
  qty: number,
  tiers?: VolumeDiscountTierLike[],
): number {
  return volumeRemiseRateFromTiers(qty, tiers ?? getPublishedGenericVolumeTiers());
}

export function volumeRemiseAmount(
  sousTotal: number,
  qty: number,
  tiers?: VolumeDiscountTierLike[],
): number {
  return Math.round(sousTotal * volumeRemiseRate(qty, tiers));
}
