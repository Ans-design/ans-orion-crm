import { prisma } from '@/lib/prisma';
import { getProductConfig } from '@/lib/data/config-types';
import { CATALOGUE } from '@/lib/data/catalogue';
import { getGfArticleMeta } from '@/lib/grand-format/article-meta';
import { gfLaizeFallbackLabels } from '@/lib/grand-format/laize-fallbacks';
import { laizeCmToChipLabel, parseLaizeLabelToCm } from '@/lib/grand-format/laize-utils';
import type { GfArticleStockProfile, GfLaizeStockEntry, GfPlateStockEntry } from '@/lib/grand-format/types';
import { containsQ } from '@/lib/prisma-filters';
import { lookupSalePrice2026ForArticle } from '@/lib/services/sale-price-service';
import { stockAvailable } from '@/lib/services/stock-service';

function stockOrClauses(keys: string[]) {
  return keys.flatMap((k) => [
    { materialKey: containsQ(k) },
    { label: containsQ(k) },
  ]);
}

export async function loadGrandFormatStockProfile(articleId: string): Promise<GfArticleStockProfile | null> {
  const meta = getGfArticleMeta(articleId);
  if (!meta) return null;

  const article = CATALOGUE.find((a) => a.id === articleId);
  const productConfig = getProductConfig(articleId, article?.configType);

  let items: Array<{
    id: string;
    sku: string;
    label: string;
    quantity: number;
    reservedQty: number;
    widthM: number | null;
    lengthM: number | null;
    stockKind: string | null;
    actif: boolean;
  }> = [];

  try {
    items = await prisma.stockItem.findMany({
      where: {
        category: 'GrandFormat',
        actif: true,
        OR: stockOrClauses(meta.materialKeys),
      },
      select: {
        id: true,
        sku: true,
        label: true,
        quantity: true,
        reservedQty: true,
        widthM: true,
        lengthM: true,
        stockKind: true,
        actif: true,
      },
    });
  } catch {
    items = [];
  }

  const laizes: GfLaizeStockEntry[] = [];
  const plates: GfPlateStockEntry[] = [];
  const laizeCmSeen = new Set<number>();

  for (const item of items) {
    const avail = stockAvailable(item);
    const available = avail > 0;

    if (meta.stockKind === 'plaque' || item.stockKind === 'plaque') {
      const w = item.widthM != null ? Math.round(item.widthM * 100) : 0;
      const h = item.lengthM != null ? Math.round(item.lengthM * 100) : 0;
      if (w > 0 && h > 0) {
        plates.push({
          label: `${w} × ${h} cm`,
          largeurCm: w,
          hauteurCm: h,
          stockItemId: item.id,
          sku: item.sku,
          available,
        });
        if (!laizeCmSeen.has(w)) {
          laizeCmSeen.add(w);
          laizes.push({
            cm: w,
            label: laizeCmToChipLabel(w),
            stockItemId: item.id,
            sku: item.sku,
            available,
            quantity: avail,
          });
        }
      }
      continue;
    }

    const widthCm = item.widthM != null ? Math.round(item.widthM * 100) : null;
    if (widthCm && widthCm > 0 && !laizeCmSeen.has(widthCm)) {
      laizeCmSeen.add(widthCm);
      laizes.push({
        cm: widthCm,
        label: laizeCmToChipLabel(widthCm),
        stockItemId: item.id,
        sku: item.sku,
        available,
        quantity: avail,
      });
    }
  }

  laizes.sort((a, b) => a.cm - b.cm);

  let prixA0: number | null = null;
  if (article) {
    const hit = await lookupSalePrice2026ForArticle(articleId, article.name, { format: 'A0' }, 1);
    if (hit?.salePriceAr && hit.salePriceAr > 0) {
      prixA0 = hit.salePriceAr;
    }
  }

  return {
    articleId,
    stockKind: meta.stockKind,
    laizes,
    plates,
    prixA0,
    prixM2Fallback: prixA0 ?? productConfig?.prixM2 ?? meta.prixM2Fallback ?? null,
    materialKeys: meta.materialKeys,
  };
}

export function fallbackLaizeLabelsFromMeta(articleId: string): string[] {
  return gfLaizeFallbackLabels(articleId);
}

/** Laizes utilisables pour le calcul (stock disponible, sinon fallback métier). */
export function resolveAvailableLaizesCm(profile: GfArticleStockProfile, articleId: string): number[] {
  const fromStock = profile.laizes.filter((l) => l.available).map((l) => l.cm);
  if (fromStock.length) return fromStock;
  return fallbackLaizeLabelsFromMeta(articleId)
    .map((label) => parseLaizeLabelToCm(label))
    .filter((cm): cm is number => cm != null && cm > 0);
}
