import type { MaterialDto } from '@/lib/server/modules/pricing/base-material.dto';

export type MaterialPriceUnifiedRow = MaterialDto & {
  articleId: string | null;
  articleName: string | null;
  formatLabel: string | null;
  face: string | null;
  referenceQty?: number | null;
  basePrintingPriceId: string | null;
  rowKind: 'material' | 'article_price';
  stockDisplay?: string | null;
  stockStatus?: string | null;
  stockSku?: string | null;
  stockSupplier?: string | null;
  stockSalePrice?: number | null;
  stockPhysical?: number | null;
  stockReserved?: number | null;
  lastPurchasePrice?: number | null;
  lastPurchaseDate?: string | null;
  archivedAt?: string | null;
  /** Champs étendus table maîtresse */
  widthMm?: number | null;
  heightMm?: number | null;
  dimensionUnit?: string | null;
  stockLocation?: string | null;
  stockSite?: string | null;
  laize?: string | null;
  size?: string | null;
  color?: string | null;
  location?: string | null;
  contextPricesSummary?: string | null;
  stockDisponible?: number | null;
};