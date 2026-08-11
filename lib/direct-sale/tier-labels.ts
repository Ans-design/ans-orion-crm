import { formatPrice } from '@/lib/data/catalogue';

export type DirectSaleTierLike = {
  minQty: number;
  maxQty?: number | null;
  discountType: string;
  discountValue: number;
  finalUnitPrice?: number | null;
  label?: string | null;
};

export function formatTierQtyRange(minQty: number, maxQty?: number | null): string {
  if (maxQty != null && maxQty > 0) return `${minQty} – ${maxQty}`;
  return `${minQty}+`;
}

export function formatTierDiscount(
  tier: Pick<DirectSaleTierLike, 'discountType' | 'discountValue' | 'finalUnitPrice'>,
  basePrice?: number,
): string {
  if (tier.discountType === 'percent') {
    return `-${tier.discountValue} %`;
  }
  if (tier.discountType === 'fixed') {
    const unit = basePrice != null ? Math.max(0, basePrice - tier.discountValue) : null;
    return unit != null
      ? `${formatPrice(unit)} Ar/u (−${formatPrice(tier.discountValue)})`
      : `−${formatPrice(tier.discountValue)} Ar`;
  }
  const unit = tier.finalUnitPrice ?? tier.discountValue;
  return `${formatPrice(unit)} Ar/u`;
}

export const TIER_DISCOUNT_TYPE_OPTIONS = [
  { id: 'unit_price', label: 'Prix unitaire fixe' },
  { id: 'percent', label: 'Remise %' },
  { id: 'fixed', label: 'Remise fixe (Ar)' },
] as const;
