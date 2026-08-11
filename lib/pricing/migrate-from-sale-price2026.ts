import { prisma } from '@/lib/prisma';
import { findCatalogueItem } from '@/lib/data/catalogue-meta';
import { getProductConfig } from '@/lib/data/config-types';
import type { DiscountTierSeed } from '@/lib/pricing/config-to-dynamic-pricing';
import { containsQ } from '@/lib/prisma-filters';
import { resolveProductSearchTerms } from '@/lib/services/sale-price-service';

export const SALE_PRICE_MIGRATION_SOURCE = 'salePrice2026-migration';

export type SalePriceMigrationResult = {
  articleId: string;
  rowsMatched: number;
  tiersWritten: number;
  prixBase: number | null;
  skipped: boolean;
  reason?: string;
  sampleRowIds: string[];
};

type SalePriceRow = {
  id: string;
  sourceId: string | null;
  productNormalized: string;
  format: string | null;
  face: string | null;
  material: string | null;
  grammage: string | null;
  qtyTier: string | null;
  salePriceAr: number | null;
  sourcePriceAr: number | null;
};

export function parseSalePriceQtyTier(qtyTier: string | null | undefined): { minQty: number; maxQty: number | null } {
  if (!qtyTier?.trim()) return { minQty: 1, maxQty: null };

  const t = qtyTier.toLowerCase().trim();
  const range = t.match(/(\d+)\s*[-–àa]\s*(\d+)/);
  if (range) {
    return { minQty: parseInt(range[1], 10), maxQty: parseInt(range[2], 10) };
  }

  const plus = t.match(/(\d+)\s*\+/);
  if (plus) return { minQty: parseInt(plus[1], 10), maxQty: null };

  if (t.includes('1-9') || t.includes('1 à 9')) return { minQty: 1, maxQty: 9 };
  if (t.includes('10-49') || t.includes('10 à 49')) return { minQty: 10, maxQty: 49 };
  if (t.includes('50-99') || t.includes('50 à 99')) return { minQty: 50, maxQty: 99 };
  if (t.includes('100-249') || t.includes('100 à 249')) return { minQty: 100, maxQty: 249 };
  if (t.includes('250-499')) return { minQty: 250, maxQty: 499 };
  if (t.includes('500') && !t.includes('250')) return { minQty: 500, maxQty: null };
  if (t.includes('1000')) return { minQty: 1000, maxQty: null };

  const lone = t.match(/(\d+)/);
  if (lone) return { minQty: parseInt(lone[1], 10), maxQty: null };

  return { minQty: 1, maxQty: null };
}

function scoreRowForConfig(
  row: SalePriceRow,
  config: Record<string, unknown>,
  productTerms: string[],
): number {
  let score = 0;
  const pn = row.productNormalized.toLowerCase();
  for (const term of productTerms) {
    if (pn.includes(term.toLowerCase())) score += 10;
  }

  const format = String(config.format || config.dimension || config.dim || '').trim();
  if (format && row.format?.toLowerCase().includes(format.toLowerCase().slice(0, 6))) score += 8;

  const face = String(config.face || config.face_interieur || '').trim();
  if (face && row.face?.toLowerCase().includes(face.toLowerCase().slice(0, 5))) score += 5;

  const material = String(config.matiere || config.paperType || config.matiere_int || '').trim();
  if (material && row.material?.toLowerCase().includes(material.toLowerCase().slice(0, 3))) score += 3;

  const grammage = String(config.grammage || config.grammage_int || config.paperWeight || '').trim();
  if (grammage && row.grammage?.toLowerCase().includes(grammage.toLowerCase().replace(/\s/g, ''))) score += 3;

  const qty = Number(config.qty) || 100;
  const tier = row.qtyTier ?? '';
  const { minQty, maxQty } = parseSalePriceQtyTier(tier);
  if (qty >= minQty && (maxQty == null || qty <= maxQty)) score += 6;

  return score;
}

export function buildDiscountTiersFromSalePriceRows(
  rows: SalePriceRow[],
  config: Record<string, unknown>,
  productTerms: string[],
  prixBaseHint: number | null,
): DiscountTierSeed[] {
  const autoRows = rows.filter((r) => (r.salePriceAr ?? 0) > 0);
  if (!autoRows.length) return [];

  const byTier = new Map<string, SalePriceRow>();
  for (const row of autoRows) {
    const tierKey = (row.qtyTier || 'default').trim().toLowerCase();
    const current = byTier.get(tierKey);
    const rowScore = scoreRowForConfig(row, config, productTerms);
    if (!current || rowScore > scoreRowForConfig(current, config, productTerms)) {
      byTier.set(tierKey, row);
    }
  }

  const tiers: DiscountTierSeed[] = [...byTier.values()]
    .map((row) => {
      const { minQty, maxQty } = parseSalePriceQtyTier(row.qtyTier);
      const unitPrice = Math.round(row.salePriceAr ?? 0);
      const reference = prixBaseHint && prixBaseHint > 0 ? prixBaseHint : unitPrice;
      const discountPercent =
        reference > 0 ? Math.max(0, Math.round((1 - unitPrice / reference) * 1000) / 10) : 0;
      return { minQty, maxQty, unitPrice, discountPercent };
    })
    .sort((a, b) => a.minQty - b.minQty);

  const deduped: DiscountTierSeed[] = [];
  for (const tier of tiers) {
    if (deduped.some((d) => d.minQty === tier.minQty)) continue;
    deduped.push(tier);
  }

  return deduped;
}

export async function fetchSalePrice2026RowsForArticle(
  articleId: string,
  articleName: string,
): Promise<SalePriceRow[]> {
  const byArticleId = await prisma.salePrice2026.findMany({
    where: { articleId, actif: true, priceType: 'auto', salePriceAr: { gt: 0 } },
    take: 200,
    select: {
      id: true,
      sourceId: true,
      productNormalized: true,
      format: true,
      face: true,
      material: true,
      grammage: true,
      qtyTier: true,
      salePriceAr: true,
      sourcePriceAr: true,
    },
  });
  if (byArticleId.length) return byArticleId;

  const productTerms = resolveProductSearchTerms(articleId, articleName);
  const orProducts = productTerms.slice(0, 4).map((term) => ({
    productNormalized: containsQ(term),
  }));

  return prisma.salePrice2026.findMany({
    where: {
      actif: true,
      priceType: 'auto',
      salePriceAr: { gt: 0 },
      OR: orProducts,
    },
    take: 200,
    select: {
      id: true,
      sourceId: true,
      productNormalized: true,
      format: true,
      face: true,
      material: true,
      grammage: true,
      qtyTier: true,
      salePriceAr: true,
      sourcePriceAr: true,
    },
  });
}

export async function migrateArticleFromSalePrice2026(
  articleId: string,
  options?: { referenceConfig?: Record<string, unknown>; dryRun?: boolean },
): Promise<SalePriceMigrationResult> {
  const article = findCatalogueItem(articleId);
  if (!article) {
    return { articleId, rowsMatched: 0, tiersWritten: 0, prixBase: null, skipped: true, reason: 'Article inconnu', sampleRowIds: [] };
  }

  const profile = await prisma.articlePricingProfile.findUnique({ where: { articleId } });
  if (!profile) {
    return { articleId, rowsMatched: 0, tiersWritten: 0, prixBase: null, skipped: true, reason: 'Profil manquant — sync catalogue', sampleRowIds: [] };
  }

  if (profile.status === 'published') {
    return { articleId, rowsMatched: 0, tiersWritten: 0, prixBase: null, skipped: true, reason: 'Article publié — dépublier avant migration', sampleRowIds: [] };
  }

  const productConfig = getProductConfig(articleId, article.configType);
  const referenceConfig = {
    qty: productConfig?.qtyDefault ?? 100,
    ...options?.referenceConfig,
  };

  const rows = await fetchSalePrice2026RowsForArticle(articleId, article.name);
  if (!rows.length) {
    return { articleId, rowsMatched: 0, tiersWritten: 0, prixBase: null, skipped: true, reason: 'Aucune ligne PRIX 2026', sampleRowIds: [] };
  }

  const productTerms = resolveProductSearchTerms(articleId, article.name);
  const prixBaseHint = productConfig?.prixBase ?? article.prixDepart ?? profile.prixBase;
  const tiers = buildDiscountTiersFromSalePriceRows(rows, referenceConfig, productTerms, prixBaseHint);

  if (!tiers.length) {
    return {
      articleId,
      rowsMatched: rows.length,
      tiersWritten: 0,
      prixBase: null,
      skipped: true,
      reason: 'Lignes PRIX 2026 sans paliers exploitables',
      sampleRowIds: rows.slice(0, 3).map((r) => r.id),
    };
  }

  const prixBase = tiers[0]?.unitPrice ?? prixBaseHint ?? null;

  if (!options?.dryRun) {
    await prisma.$transaction(async (tx) => {
      await tx.discountTier.deleteMany({ where: { articleId } });
      for (const tier of tiers) {
        await tx.discountTier.create({
          data: {
            articleId,
            minQty: tier.minQty,
            maxQty: tier.maxQty,
            unitPrice: tier.unitPrice,
            discountPercent: tier.discountPercent,
            active: true,
            source: SALE_PRICE_MIGRATION_SOURCE,
          },
        });
      }
      await tx.articlePricingProfile.update({
        where: { articleId },
        data: {
          prixBase,
          source: SALE_PRICE_MIGRATION_SOURCE,
        },
      });
    });
  }

  return {
    articleId,
    rowsMatched: rows.length,
    tiersWritten: tiers.length,
    prixBase,
    skipped: false,
    sampleRowIds: rows.slice(0, 5).map((r) => r.id),
  };
}

export async function migrateMigrationPilotBatch(dryRun = false) {
  const { MIGRATION_PILOT_ARTICLES } = await import('@/lib/pricing/compare-pricing-migration');
  const { resolveMigrationPilotConfig } = await import('@/lib/pricing/migration-pilot-configs');

  const results: SalePriceMigrationResult[] = [];
  for (const articleId of MIGRATION_PILOT_ARTICLES) {
    const referenceConfig = resolveMigrationPilotConfig(articleId);
    results.push(await migrateArticleFromSalePrice2026(articleId, { referenceConfig, dryRun }));
  }
  return results;
}
