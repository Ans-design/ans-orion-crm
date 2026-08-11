import { prisma } from '@/lib/prisma';
import { CATALOGUE } from '@/lib/data/catalogue';
import { findCatalogueItem } from '@/lib/data/catalogue-meta';
import { getDynamicPricingStats } from '@/lib/pricing/publish-dynamic-pricing';
import { countAnomaliesBySeverity, scanPricingAnomalies } from '@/lib/pricing/pricing-anomalies';
import { getBackofficeSyncStatus } from '@/lib/server/modules/backoffice/backoffice-sync.service';
import { updateBackofficeArticle } from '@/lib/services/backoffice-article-service';
import { formatTiersSummary, mapFormulaStatus } from './admin-backoffice.mapper';
import type { AdminBackofficeOverview, ArticlePriceTableRow } from './admin-backoffice.types';

export async function getAdminBackofficeOverview(): Promise<AdminBackofficeOverview> {
  const [
    stats,
    anomalies,
    sync,
    sale2026Count,
    publishedFormulas,
    visibleConfig,
    materials,
    linkedStockIds,
  ] = await Promise.all([
    getDynamicPricingStats(),
    scanPricingAnomalies(400),
    getBackofficeSyncStatus(),
    prisma.salePrice2026.count({ where: { actif: true } }).catch(() => 0),
    prisma.formulaVersion.count({ where: { status: 'published' } }).catch(() => 0),
    prisma.articlePricingProfile.count({ where: { status: 'published', active: true } }),
    prisma.baseMaterial.findMany({
      where: { archived: false },
      select: {
        publicationStatus: true,
        basePrintPrice: true,
        maxPrice: true,
        stockItemId: true,
        anomalyNotes: true,
      },
    }).catch(() => []),
    prisma.baseMaterial.findMany({
      where: { archived: false, stockItemId: { not: null } },
      select: { stockItemId: true },
    }).catch(() => []),
  ]);

  const stockIds = linkedStockIds
    .map((m) => m.stockItemId)
    .filter((id): id is string => Boolean(id));

  const stockItems = stockIds.length
    ? await prisma.stockItem.findMany({
        where: { id: { in: stockIds } },
        select: { id: true, quantity: true, reservedQty: true, minQty: true },
      }).catch(() => [])
    : [];

  let stockCritical = 0;
  let stockRupture = 0;
  for (const s of stockItems) {
    const available = Math.max(0, s.quantity - (s.reservedQty ?? 0));
    if (available <= 0) stockRupture += 1;
    else if (available <= (s.minQty ?? 0)) stockCritical += 1;
  }

  const materialsPublished = materials.filter((m) => m.publicationStatus === 'published').length;
  const materialsDraft = materials.filter((m) => m.publicationStatus === 'draft').length;
  const materialsMissingPrice = materials.filter(
    (m) => m.basePrintPrice == null && m.maxPrice == null,
  ).length;
  const materialsLinkedStock = materials.filter((m) => m.stockItemId != null).length;
  const materialsWithAnomalies = materials.filter((m) => Boolean(m.anomalyNotes?.trim())).length;

  const anomalyCounts = countAnomaliesBySeverity(anomalies);
  const catalogueTotal = CATALOGUE.length;
  const withoutFormula = Math.max(0, catalogueTotal - stats.published);

  return {
    articlesActive: stats.published + stats.draft,
    articlesVisiblePos: visibleConfig,
    formulasPublished: publishedFormulas,
    drafts: stats.draft,
    withoutFormula,
    anomaliesCritical: anomalyCounts.critical,
    anomaliesWarning: anomalyCounts.warning,
    prix2026NotMigrated: Math.max(0, sale2026Count - stats.published),
    unpublishedChanges: sync.pendingChanges,
    lastPublishedAt: sync.lastPublishedAt,
    lastPublishedBy: sync.lastPublishedBy,
    catalogueTotal,
    engineVersion: 'dynamic-v4',
    materialsTotal: materials.length,
    materialsPublished,
    materialsDraft,
    materialsMissingPrice,
    materialsLinkedStock,
    materialsWithAnomalies,
    stockCritical,
    stockRupture,
    syncStatus: sync.status,
    syncMessage: sync.message,
  };
}

export async function getArticlesPriceTable(params: {
  search?: string;
  status?: string;
  family?: string;
  limit?: number;
} = {}): Promise<{ rows: ArticlePriceTableRow[]; total: number }> {
  const limit = Math.min(100, params.limit ?? 50);
  const where: {
    status?: string;
    family?: string;
    OR?: { articleId?: { contains: string }; articleLabel?: { contains: string } }[];
  } = {};

  if (params.status && params.status !== 'all') where.status = params.status;
  if (params.family && params.family !== 'all') where.family = params.family;
  if (params.search?.trim()) {
    const q = params.search.trim();
    where.OR = [{ articleId: { contains: q } }, { articleLabel: { contains: q } }];
  }

  const [profiles, anomalies, sale2026Ids] = await Promise.all([
    prisma.articlePricingProfile.findMany({
      where,
      take: limit,
      orderBy: [{ family: 'asc' }, { articleLabel: 'asc' }],
      include: {
        discountTiers: { where: { active: true }, orderBy: { minQty: 'asc' } },
        formulaVersions: { orderBy: { version: 'desc' }, take: 3 },
        optionGroups: {
          where: { active: true },
          select: { impactsPrice: true, isInformational: true, visiblePos: true },
        },
        materialPrices: { where: { active: true }, select: { id: true } },
        _count: { select: { materialPrices: true, optionGroups: true } },
      },
    }),
    scanPricingAnomalies(500),
    prisma.salePrice2026.findMany({
      where: { actif: true },
      select: { productNormalized: true },
      distinct: ['productNormalized'],
    }).catch(() => [] as { productNormalized: string }[]),
  ]);

  const saleSet = new Set(sale2026Ids.map((s) => s.productNormalized));
  const anomalyByArticle = new Map<string, { critical: number; warning: number }>();

  for (const a of anomalies) {
    if (!a.articleId) continue;
    const cur = anomalyByArticle.get(a.articleId) ?? { critical: 0, warning: 0 };
    if (a.severity === 'critical') cur.critical += 1;
    else if (a.severity === 'warning') cur.warning += 1;
    anomalyByArticle.set(a.articleId, cur);
  }

  const rows: ArticlePriceTableRow[] = profiles.map((p) => {
    const cat = findCatalogueItem(p.articleId);
    const formula = mapFormulaStatus(p.formulaVersions);
    const pricingVars = p.optionGroups.filter((g) => g.impactsPrice && !g.isInformational);
    const indicativeVars = p.optionGroups.filter((g) => g.isInformational || !g.impactsPrice);
    const visiblePos = p.optionGroups.length === 0
      ? p.active && p.status === 'published'
      : p.optionGroups.some((g) => g.visiblePos);
    const an = anomalyByArticle.get(p.articleId) ?? { critical: 0, warning: 0 };

    let prix2026Status: ArticlePriceTableRow['prix2026Status'] = 'n/a';
    if (saleSet.has(p.articleId) || saleSet.has(cat?.name ?? '')) {
      prix2026Status = p.status === 'published' ? 'migrated' : 'partial';
    } else if (cat) {
      prix2026Status = 'not_migrated';
    }

    return {
      articleId: p.articleId,
      articleLabel: p.articleLabel,
      icon: cat?.icon ?? '📦',
      family: p.family,
      category: cat?.category ?? p.family,
      status: p.status,
      active: p.active,
      visiblePos,
      calculationType: p.calculationType,
      saleUnit: p.saleUnit,
      prixBase: p.prixBase,
      prixM2: p.prixM2,
      qtyMin: p.qtyMin,
      tiersSummary: formatTiersSummary(p.discountTiers),
      tiersCount: p.discountTiers.length,
      materialCount: p._count.materialPrices,
      pricingVariableCount: pricingVars.length,
      indicativeVariableCount: indicativeVars.length,
      formulaStatus: formula.status,
      formulaVersion: formula.version,
      prix2026Status,
      anomalyCritical: an.critical,
      anomalyWarning: an.warning,
      updatedAt: p.updatedAt.toISOString(),
      publicationStatus: p.status === 'published' ? 'synced' : p.status === 'archived' ? 'archived' : 'draft',
    };
  });

  const total = await prisma.articlePricingProfile.count({ where });
  return { rows, total };
}

export async function patchArticlePriceTableRow(
  articleId: string,
  input: {
    prixBase?: number | null;
    prixM2?: number | null;
    qtyMin?: number | null;
    status?: string;
    active?: boolean;
    calculationType?: string;
    saleUnit?: string;
  },
) {
  return updateBackofficeArticle(articleId, input);
}
