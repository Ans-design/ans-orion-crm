import { CAT_LABELS } from '@/lib/data/catalogue';
import { findCatalogueItem, POS_CATALOGUE } from '@/lib/data/catalogue-meta';
import { getProductConfig } from '@/lib/data/config-types';
import { extractDiscountTiers, inferCalculationType } from '@/lib/pricing/config-to-dynamic-pricing';
import type { TierMode, TierTableRow } from './admin-backoffice-tiers.types';

export function resolveArticleMeta(articleId: string) {
  const cat = findCatalogueItem(articleId);
  if (!cat) return null;
  return {
    articleId,
    articleLabel: cat.name,
    family: CAT_LABELS[cat.category] ?? cat.category,
    category: cat.category,
    saleUnit: cat.unit ?? 'pièce',
    configType: cat.configType,
  };
}

export function getConfigTiers(articleId: string): {
  tiers: Omit<TierTableRow, 'id' | 'articleId'>[];
  tierMode: TierMode;
  qtyMin: number | null;
  prixBase: number | null;
  calculationType: string;
  saleUnit: string;
} {
  const meta = resolveArticleMeta(articleId);
  if (!meta) {
    return { tiers: [], tierMode: 'unit_price', qtyMin: null, prixBase: null, calculationType: 'piece', saleUnit: 'pièce' };
  }
  const cfg = getProductConfig(articleId, meta.configType);
  const prixBase = cfg?.prixBase ?? null;
  const seeds = extractDiscountTiers(cfg?.priceTiers, prixBase);
  const tiers = seeds.map((s, i) => ({
    variantKey: '',
    variantLabel: null as string | null,
    minQty: s.minQty,
    maxQty: s.maxQty,
    value: s.unitPrice ?? s.discountPercent,
    unitPrice: s.unitPrice,
    discountPercent: s.discountPercent,
    mode: (s.discountPercent > 0 && !s.unitPrice ? 'percent' : 'unit_price') as TierMode,
    active: true,
    source: 'catalogue',
    sortOrder: i,
  }));
  return {
    tiers,
    tierMode: tiers.some((t) => t.mode === 'percent') ? 'percent' : 'unit_price',
    qtyMin: cfg?.qtyMin ?? null,
    prixBase,
    calculationType: cfg ? inferCalculationType(articleId, cfg) : 'piece',
    saleUnit: meta.saleUnit,
  };
}

export function formatTierRange(min: number, max: number | null, unit: string): string {
  const u = unit || 'pcs';
  if (max == null) return `${min}+ ${u}`;
  return `${min}–${max} ${u}`;
}

export { POS_CATALOGUE };
