/**
 * Index catalogue POS Commercial — compteurs catégories + rebuild.
 * Source : getPosCatalogue (même payload que le POS).
 */
import { getPosCatalogue } from '@/lib/services/catalogue-service';
import { detectCatalogDuplicates } from '@/lib/services/detect-catalog-duplicates.service';
import { notifyAdminModuleMutation } from '@/lib/services/admin-data-sync.service';
import { syncArticleOptionsToPOS } from '@/lib/services/catalog-options-sync.service';
import { rebuildPOSPriceIndex } from '@/lib/services/pricing-data-sync.service';
import { syncCatalogueProfilesToDb } from '@/lib/services/catalogue-sync-service';
import { logAudit } from '@/lib/audit';
import { CAT_LABELS, type Category } from '@/lib/data/catalogue';

export type CategoryCounter = {
  categoryId: string;
  label: string;
  count: number;
};

export type PosCatalogIndexReport = {
  totalArticles: number;
  categories: CategoryCounter[];
  duplicates: Awaited<ReturnType<typeof detectCatalogDuplicates>>;
  rebuiltAt: string;
};

export async function recalculateCategoryCounters(
  role = 'commercial',
): Promise<CategoryCounter[]> {
  const payload = await getPosCatalogue(role);
  const counts = new Map<string, number>();
  for (const item of payload.items ?? []) {
    const cat = String(item.category ?? 'autre');
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([categoryId, count]) => ({
      categoryId,
      label: CAT_LABELS[categoryId as keyof typeof CAT_LABELS] ?? categoryId,
      count,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}

export async function rebuildPOSCatalogIndex(opts?: {
  userId?: string;
  userName?: string;
  /** Inclure sync chips goodies (défaut true) */
  options?: boolean;
  /** Inclure rebuild prix (défaut true) */
  prices?: boolean;
}): Promise<PosCatalogIndexReport> {
  await syncCatalogueProfilesToDb();
  if (opts?.options !== false) {
    await syncArticleOptionsToPOS(undefined, opts);
  }
  if (opts?.prices !== false) {
    await rebuildPOSPriceIndex().catch(() => null);
  }

  const [categories, duplicates, payload] = await Promise.all([
    recalculateCategoryCounters(),
    detectCatalogDuplicates(),
    getPosCatalogue('commercial'),
  ]);

  const report: PosCatalogIndexReport = {
    totalArticles: payload.items?.length ?? 0,
    categories,
    duplicates,
    rebuiltAt: new Date().toISOString(),
  };

  await notifyAdminModuleMutation('pos-catalog-index', {
    userId: opts?.userId,
    userName: opts?.userName,
    details: {
      totalArticles: report.totalArticles,
      duplicateCritical: duplicates.critical,
      categories: categories.length,
    },
  });

  await logAudit({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'SYNC',
    entity: 'PosCatalogIndex',
    entityLabel: 'rebuildPOSCatalogIndex',
    details: report,
  });

  return report;
}

export const posCatalogIndexService = {
  recalculateCategoryCounters,
  rebuildPOSCatalogIndex,
  async getIndexSnapshot() {
    const [categories, duplicates, payload] = await Promise.all([
      recalculateCategoryCounters(),
      detectCatalogDuplicates(),
      getPosCatalogue('commercial'),
    ]);
    return {
      totalArticles: payload.items?.length ?? 0,
      categories,
      duplicates,
      rebuiltAt: new Date().toISOString(),
    } satisfies PosCatalogIndexReport;
  },
};
