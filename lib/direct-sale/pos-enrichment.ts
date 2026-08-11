import { prisma } from '@/lib/prisma';
import type { PosCatalogueItem } from '@/lib/services/catalogue-pos-builder';
import { resolvePosArticleId } from '@/lib/services/direct-sale-pos-sync.service';
import {
  articleHasPrix2026Grid,
  getPrix2026EntryUnitPrice,
  getPrix2026SheetLabel,
} from '@/lib/data/prix-2026-grids';
import { resolvePosCatalogEntryPrice } from '@/lib/pos/pos-catalog-entry-price';

export type DirectSalePosMeta = {
  pricingMode: 'direct' | 'excel_grid';
  unitPrice: number;
  unit: string;
  isCustomizable: boolean;
  requiresQuoteIfCustom: boolean;
  allowManualPrice: boolean;
  minQuantity: number;
  maxQuantity: number | null;
  addonCount: number;
  /** Onglet Excel si prix aligné PRIX 2026 */
  excelSheet?: string | null;
};

export type DirectSalePosMetaMap = Map<string, DirectSalePosMeta>;

const EXCEL_GRID_ARTICLE_IDS = [
  'cv-std',
  'cv-fidelite',
  'cv-jeux',
  'fly-std',
  'gd-mug',
  'gd-stylo',
  'gd-pins',
  'gd-gourde',
  'plv-rollup',
  'plv-xbanner',
  'tx-tshirt',
  'tx-polo',
  'tx-sweat',
  'tx-casquette',
  'tx-bob',
  'tx-trousse',
  'tx-totebag',
] as const;

function excelMinQty(articleId: string): number {
  if (articleId.startsWith('cv-')) return 50;
  if (articleId === 'gd-stylo' || articleId === 'gd-pins') return 30;
  if (articleId === 'fly-std') return 20;
  if (articleId === 'tx-casquette' || articleId === 'tx-bob' || articleId === 'tx-trousse') return 4;
  return 1;
}

/** Charge les métadonnées vente directe indexées par ID POS. */
export async function loadDirectSalePosMetaMap(): Promise<DirectSalePosMetaMap> {
  const map: DirectSalePosMetaMap = new Map();
  try {
    const articles = await prisma.directSaleArticle.findMany({
      where: { status: 'published', visiblePOS: true },
      include: { _count: { select: { addons: true } } },
    });
    for (const a of articles) {
      const posId = resolvePosArticleId(a);
      const excelEntry = getPrix2026EntryUnitPrice(posId);
      const excelSheet = getPrix2026SheetLabel(posId);
      const useExcel = excelEntry != null && excelEntry > 0;
      map.set(posId, {
        pricingMode: useExcel ? 'excel_grid' : 'direct',
        unitPrice: useExcel ? excelEntry! : a.unitPrice,
        unit: a.unit,
        isCustomizable: a.isCustomizable,
        requiresQuoteIfCustom: a.requiresQuoteIfCustom,
        allowManualPrice: a.allowManualPrice,
        minQuantity: useExcel ? excelMinQty(posId) : a.minQuantity,
        maxQuantity: a.maxQuantity,
        addonCount: a._count.addons,
        excelSheet: useExcel ? excelSheet : null,
      });
    }
  } catch {
    /* table absente en dev sans migration */
  }

  for (const id of EXCEL_GRID_ARTICLE_IDS) {
    if (map.has(id)) continue;
    if (!articleHasPrix2026Grid(id)) continue;
    const excelEntry = getPrix2026EntryUnitPrice(id);
    if (excelEntry == null || excelEntry <= 0) continue;
    map.set(id, {
      pricingMode: 'excel_grid',
      unitPrice: excelEntry,
      unit: 'pièce',
      isCustomizable: true,
      requiresQuoteIfCustom: false,
      allowManualPrice: false,
      minQuantity: excelMinQty(id),
      maxQuantity: null,
      addonCount: 0,
      excelSheet: getPrix2026SheetLabel(id),
    });
  }

  return map;
}

export function enrichPosItemWithDirectSale(
  item: PosCatalogueItem,
  metaMap: DirectSalePosMetaMap,
): PosCatalogueItem {
  const meta = metaMap.get(item.id);
  if (!meta) {
    const excelEntry = getPrix2026EntryUnitPrice(item.id);
    if (excelEntry != null && excelEntry > 0) {
      return {
        ...item,
        prixDepart: excelEntry,
        directSale: {
          pricingMode: 'excel_grid',
          unitPrice: excelEntry,
          unit: item.unit || 'pièce',
          isCustomizable: true,
          requiresQuoteIfCustom: false,
          allowManualPrice: false,
          minQuantity: item.minQty ?? excelMinQty(item.id),
          maxQuantity: null,
          addonCount: 0,
          excelSheet: getPrix2026SheetLabel(item.id),
        },
        priceSource: item.priceSource === 'catalogue' ? 'database' : item.priceSource,
        priceConfigured: true,
        priceMissingReason: null,
        priceMode: item.priceMode === 'quote_required' ? item.priceMode : 'calculated',
      };
    }
    // Fallback moteurs / catalogue (doypack, gobelet, tampon…)
    const entry = resolvePosCatalogEntryPrice(item.id);
    if (entry != null && entry > 0 && (item.prixDepart == null || item.prixDepart <= 0)) {
      return {
        ...item,
        prixDepart: entry,
        priceConfigured: true,
        priceMissingReason: null,
        priceMode: item.priceMode === 'quote_required' ? item.priceMode : 'calculated',
      };
    }
    return item;
  }
  return {
    ...item,
    prixDepart: meta.unitPrice > 0 ? meta.unitPrice : item.prixDepart,
    directSale: meta,
    priceSource: item.priceSource === 'catalogue' ? 'database' : item.priceSource,
    priceConfigured: meta.unitPrice > 0 || item.priceConfigured,
    priceMissingReason: meta.unitPrice > 0 ? null : item.priceMissingReason,
    priceMode:
      meta.requiresQuoteIfCustom && !(meta.unitPrice > 0)
        ? 'quote_required'
        : meta.unitPrice > 0
          ? meta.pricingMode === 'excel_grid'
            ? 'calculated'
            : 'direct'
          : item.priceMode,
  };
}

export async function getDirectSaleMetaForArticle(articleId: string): Promise<DirectSalePosMeta | null> {
  const map = await loadDirectSalePosMetaMap();
  return map.get(articleId) ?? null;
}
