import { prisma } from '@/lib/prisma';
import { listBackofficeArticles, getBackofficeArticle } from '@/lib/services/backoffice-article-service';
import { listBackofficeAnomalies } from './backoffice-anomaly.service';
import { getBackofficeSyncStatus } from './backoffice-sync.service';
import type { BackofficeCatalogSummary } from './backoffice.types';

function isPriceComplete(profile: {
  prixBase: number | null;
  prixM2: number | null;
  prixCm2: number | null;
  discountTiers: { unitPrice: number | null; active?: boolean }[];
}): boolean {
  const hasBase = (profile.prixBase ?? 0) > 0 || (profile.prixM2 ?? 0) > 0 || (profile.prixCm2 ?? 0) > 0;
  const hasTier = profile.discountTiers.some((t) => (t.unitPrice ?? 0) > 0 && t.active !== false);
  return hasBase || hasTier;
}

export async function getBackofficeCatalog(params: {
  search?: string;
  status?: string;
  family?: string;
  limit?: number;
} = {}): Promise<BackofficeCatalogSummary> {
  const limit = Math.min(300, params.limit ?? 200);
  const [{ items, total }, anomalies] = await Promise.all([
    listBackofficeArticles({ ...params, limit }),
    listBackofficeAnomalies(500),
  ]);

  const anomalyArticleIds = new Set(
    anomalies.items.filter((a) => a.articleId).map((a) => a.articleId as string),
  );

  const familyMap = new Map<string, number>();
  for (const row of items) {
    familyMap.set(row.family, (familyMap.get(row.family) ?? 0) + 1);
  }

  const families = [...familyMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([id, count]) => ({ id, label: id, count }));

  const articles = items.map((row) => ({
    articleId: row.articleId,
    articleLabel: row.articleLabel,
    family: row.family,
    status: row.status,
    prixComplete: isPriceComplete({
      prixBase: row.prixBase,
      prixM2: null,
      prixCm2: null,
      discountTiers: row.discountTiers ?? [],
    }),
    hasAnomaly: anomalyArticleIds.has(row.articleId),
    updatedAt: row.updatedAt.toISOString(),
  }));

  const publishedCount = items.filter((i) => i.status === 'published').length;
  const draftCount = items.filter((i) => i.status !== 'published').length;
  const lastUpdated = items.reduce<string | null>((max, i) => {
    const iso = i.updatedAt.toISOString();
    return !max || iso > max ? iso : max;
  }, null);

  return {
    families,
    articles,
    total,
    publishedCount,
    draftCount,
    anomalyCount: anomalies.critical + anomalies.warning,
    lastUpdated,
  };
}

export async function getBackofficeArticleDetail(articleId: string) {
  const [profile, sync, articleAnomalies] = await Promise.all([
    getBackofficeArticle(articleId),
    getBackofficeSyncStatus(),
    listBackofficeAnomalies(500),
  ]);

  if (!profile) return null;

  const anomalies = articleAnomalies.items.filter((a) => a.articleId === articleId);

  return { profile, sync, anomalies };
}

const DEFAULT_AUDIT_ENTITIES = [
  'ArticlePricingProfile',
  'ProductOptionGroup',
  'ProductOptionValue',
  'ConfigVersion',
  'PricingVariable',
  'SalePrice2026',
  'BaseMaterial',
  'Article',
  'DirectSaleArticle',
  'FinishingPrice',
] as const;

/** Entité demandée + alias usuels Administration. */
function resolveAuditEntityFilter(entity?: string | null): string[] {
  if (!entity?.trim()) return [...DEFAULT_AUDIT_ENTITIES];
  const key = entity.trim();
  const aliases: Record<string, string[]> = {
    BaseMaterial: ['BaseMaterial', 'BaseMaterialPrice', 'MaterialContextPrice'],
    Article: ['Article', 'ArticlePricingProfile', 'ProductOptionGroup', 'ProductOptionValue'],
    DirectSaleArticle: ['DirectSaleArticle', 'DirectSaleTier', 'DirectSaleAddon'],
    FinishingPrice: ['FinishingPrice'],
  };
  return aliases[key] ?? [key];
}

export async function listBackofficeAuditLog(limit = 80, entity?: string | null) {
  const entities = resolveAuditEntityFilter(entity);
  const rows = await prisma.auditLog.findMany({
    where: {
      entity: { in: entities },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      action: true,
      entity: true,
      entityId: true,
      entityLabel: true,
      userName: true,
      createdAt: true,
    },
  });

  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    entity: r.entity,
    entityId: r.entityId,
    entityLabel: r.entityLabel,
    userName: r.userName,
    createdAt: r.createdAt.toISOString(),
    module: 'backoffice',
  }));
}
