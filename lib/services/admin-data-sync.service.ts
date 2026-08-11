/**
 * Synchronisation centrale Admin → modules liés.
 * Appelé après publication / import matières, chips, catalogue, etc.
 */
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { invalidateKpiCaches } from '@/lib/services/kpi-cache-invalidation';

export type MaterialPricePropagationResult = {
  materialKey: string;
  unitPrice: number;
  materialPricesUpdated: number;
  profilesUpdated: number;
  printingPricesUpdated: number;
  articleIds: string[];
  directSaleSynced?: number;
  grandFormatSynced?: number;
};

function isM2Unit(saleUnit: string | null | undefined): boolean {
  const u = String(saleUnit ?? '').toLowerCase();
  return u === 'm2' || u === 'm' || u === 'm²';
}

/**
 * Propage un prix matière publié vers MaterialPrice, ArticlePricingProfile et BasePrintingPrice.
 */
export async function propagatePublishedMaterialPrice(
  materialId: string,
  opts?: { userId?: string; userName?: string },
): Promise<MaterialPricePropagationResult | null> {
  const material = await prisma.baseMaterial.findUnique({ where: { id: materialId } });
  if (!material?.materialKey) return null;

  const unitPrice = material.maxPrice ?? material.basePrintPrice;
  if (unitPrice == null || unitPrice <= 0) return null;
  if (material.publicationStatus !== 'published') return null;

  const materialKey = material.materialKey;
  const grammageFilter = material.grammage
    ? { OR: [{ grammage: material.grammage }, { grammage: null }] }
    : {};

  const isM2 = isM2Unit(material.saleUnit);

  const mpResult = await prisma.materialPrice.updateMany({
    where: {
      materialKey,
      active: true,
      ...grammageFilter,
    },
    data: isM2 ? { prixM2: unitPrice } : { prixCm2: unitPrice },
  });

  const linkedArticles = await prisma.materialPrice.findMany({
    where: { materialKey, articleId: { not: null }, active: true },
    select: { articleId: true },
    distinct: ['articleId'],
  });

  const articleIds = linkedArticles
    .map((r) => r.articleId)
    .filter((id): id is string => Boolean(id));

  let profilesUpdated = 0;
  for (const articleId of articleIds) {
    const profile = await prisma.articlePricingProfile.findUnique({
      where: { articleId },
      select: { calculationType: true },
    });
    if (!profile) continue;
    if (profile.calculationType === 'm2' || profile.calculationType === 'laize') {
      await prisma.articlePricingProfile.update({
        where: { articleId },
        data: { prixM2: unitPrice, updatedAt: new Date() },
      });
      profilesUpdated += 1;
    } else if (profile.calculationType === 'cm2' || profile.calculationType === 'developpe') {
      await prisma.articlePricingProfile.update({
        where: { articleId },
        data: { prixCm2: unitPrice, updatedAt: new Date() },
      });
      profilesUpdated += 1;
    }
  }

  const printResult = await prisma.basePrintingPrice.updateMany({
    where: { materialKey, active: true },
    data: { basePrice: unitPrice, updatedAt: new Date() },
  });

  await logAudit({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'SYNC',
    entity: 'BaseMaterial',
    entityId: materialId,
    entityLabel: material.label,
    details: {
      kind: 'material-price-propagation',
      materialKey,
      unitPrice,
      materialPricesUpdated: mpResult.count,
      profilesUpdated,
      printingPricesUpdated: printResult.count,
      articleIds: articleIds.slice(0, 50),
    },
  });

  let directSaleSynced = 0;
  let grandFormatSynced = 0;
  try {
    const { syncDirectSaleArticleToPos, syncGrandFormatPricingToPos } = await import(
      '@/lib/services/direct-sale-pos-sync.service'
    );
    const dsArticles = await prisma.directSaleArticle.findMany({
      where: { materialKey, status: 'published' },
      select: { id: true },
    });
    for (const a of dsArticles) {
      const r = await syncDirectSaleArticleToPos(a.id, {
        ...opts,
        preferArticlePrice: true,
      });
      if (r) directSaleSynced += 1;
    }
    const gfRows = await prisma.grandFormatPricing.findMany({
      where: { materialKey, status: 'published', active: true },
      select: { id: true },
    });
    for (const g of gfRows) {
      const r = await syncGrandFormatPricingToPos(g.id, opts);
      if (r) grandFormatSynced += 1;
    }
  } catch {
    /* tables vente directe absentes avant migration */
  }

  invalidateAdminCaches();

  try {
    const { invalidatePricingRuntimeCache } = await import('@/lib/pricing/pricing-runtime-cache');
    invalidatePricingRuntimeCache(`material-prop:${materialKey}`);
  } catch {
    /* best-effort */
  }

  return {
    materialKey,
    unitPrice,
    materialPricesUpdated: mpResult.count,
    profilesUpdated,
    printingPricesUpdated: printResult.count,
    articleIds,
    directSaleSynced,
    grandFormatSynced,
  };
}

/** Propage tous les matériaux publiés (après publish-all ou import complet). */
export async function propagateAllPublishedMaterialPrices(
  opts?: { userId?: string; userName?: string },
): Promise<MaterialPricePropagationResult[]> {
  const published = await prisma.baseMaterial.findMany({
    where: {
      active: true,
      archived: false,
      publicationStatus: 'published',
      OR: [{ basePrintPrice: { gt: 0 } }, { maxPrice: { gt: 0 } }],
    },
    select: { id: true },
  });

  const results: MaterialPricePropagationResult[] = [];
  for (const m of published) {
    const r = await propagatePublishedMaterialPrice(m.id, opts);
    if (r) results.push(r);
  }
  return results;
}

/**
 * Retire une matière archivée / masquée du Catalogue POS
 * (MaterialPrice + profils liés + horodatage sync).
 */
export async function withdrawMaterialFromPos(
  materialId: string,
  opts?: { userId?: string; userName?: string },
): Promise<{ materialKey: string | null; materialPricesDeactivated: number; profilesUpdated: number }> {
  const material = await prisma.baseMaterial.findUnique({ where: { id: materialId } });
  if (!material?.materialKey) {
    await invalidateAdminCaches();
    return { materialKey: null, materialPricesDeactivated: 0, profilesUpdated: 0 };
  }

  const materialKey = material.materialKey;
  const mpResult = await prisma.materialPrice.updateMany({
    where: { materialKey, active: true },
    data: { active: false },
  });

  const linked = await prisma.materialPrice.findMany({
    where: { materialKey, articleId: { not: null } },
    select: { articleId: true },
    distinct: ['articleId'],
  });
  const articleIds = linked.map((r) => r.articleId).filter((id): id is string => Boolean(id));

  let profilesUpdated = 0;
  if (articleIds.length) {
    const r = await prisma.articlePricingProfile.updateMany({
      where: { articleId: { in: articleIds }, source: { in: ['material-sync', 'catalogue-sync', 'admin-sync'] } },
      data: { active: false, updatedAt: new Date() },
    });
    profilesUpdated = r.count;
  }

  await notifyAdminModuleMutation('materials-withdraw', {
    userId: opts?.userId,
    userName: opts?.userName,
    details: { materialId, materialKey, materialPricesDeactivated: mpResult.count, profilesUpdated },
  });

  return {
    materialKey,
    materialPricesDeactivated: mpResult.count,
    profilesUpdated,
  };
}

/** Invalide caches dashboard + horodatage sync catalogue (lecture fraîche POS). */
export async function invalidateAdminCaches(): Promise<void> {
  invalidateKpiCaches();
  try {
    const { invalidatePricingRuntimeCache } = await import('@/lib/pricing/pricing-runtime-cache');
    invalidatePricingRuntimeCache('admin-caches');
  } catch {
    /* best-effort */
  }
  const now = new Date().toISOString();
  try {
    await prisma.systemConfig.upsert({
      where: { configKey: 'admin-catalogue-sync-at-v1' },
      create: { configKey: 'admin-catalogue-sync-at-v1', data: { at: now } },
      update: { data: { at: now } },
    });
  } catch {
    /* best-effort */
  }
}

/** Après import chips / variables / catalogue — marque sync sans recalcul matière.
 * V12 P0-02 : CE N’EST PAS une propagation métier. Garanties :
 * - invalidation caches admin
 * - audit SYNC AdminModule
 * Ne crée pas d’OutboxEvent ni de SyncRun. Pour sync Admin→POS utiliser
 * `adminToCommercialSyncService.syncAll` / SyncRun.
 */
export async function notifyAdminModuleMutation(
  module: string,
  opts?: { userId?: string; userName?: string; details?: Record<string, unknown> },
): Promise<void> {
  await invalidateAdminCaches();
  try {
    const { invalidatePricingRuntimeCache } = await import('@/lib/pricing/pricing-runtime-cache');
    invalidatePricingRuntimeCache(`admin-module:${module}`);
  } catch {
    /* best-effort */
  }
  await logAudit({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'SYNC',
    entity: 'AdminModule',
    entityLabel: module,
    details: { module, kind: 'cache-invalidate-only', ...opts?.details },
  });
}

/** Alias explicite V12 — même contrat que notifyAdminModuleMutation. */
export const invalidateAdminModuleCaches = notifyAdminModuleMutation;
