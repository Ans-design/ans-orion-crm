/**
 * Propagation immédiate Admin/Stock → commercial (sans attendre le cron outbox).
 * Invalide caches + rebuild index prix POS pour calculs cohérents à l’instant.
 */

export type CommercialLiveDomain = 'pricing' | 'catalogue' | 'sync' | 'stock' | 'nav';

export const PRICING_LIVE_DOMAINS: CommercialLiveDomain[] = ['pricing', 'catalogue', 'sync'];
export const STOCK_LIVE_DOMAINS: CommercialLiveDomain[] = ['stock', 'catalogue', 'sync', 'pricing'];

/**
 * Après publication tarifs / sync admin-matières.
 * rebuildIndex=true (défaut) aligne MaterialContextPrice ↔ commercial.
 */
export async function propagatePricingToCommercialNow(opts?: {
  rebuildIndex?: boolean;
  includeStock?: boolean;
}): Promise<{ domains: CommercialLiveDomain[] }> {
  const { invalidateAdminCaches } = await import('@/lib/services/admin-data-sync.service');
  await invalidateAdminCaches();

  if (opts?.rebuildIndex !== false) {
    try {
      const { rebuildPOSPriceIndex } = await import('@/lib/services/pricing-data-sync.service');
      await rebuildPOSPriceIndex();
    } catch (err) {
      console.warn('[propagatePricingToCommercialNow] rebuildPOSPriceIndex', err);
    }
  }

  try {
    const { invalidateSyncDiagnosticsCache } = await import('@/lib/services/sync.service');
    invalidateSyncDiagnosticsCache();
  } catch {
    /* best-effort */
  }

  try {
    const { advanceKpiWatermark } = await import('@/lib/kpi/invalidation-map');
    advanceKpiWatermark();
  } catch {
    /* best-effort */
  }

  const domains = opts?.includeStock
    ? ([...PRICING_LIVE_DOMAINS, 'stock'] as CommercialLiveDomain[])
    : [...PRICING_LIVE_DOMAINS];
  return { domains };
}

/** Après mutation stock (création / MAJ qty / coût liés matière). */
export async function propagateStockToCommercialNow(opts?: {
  rebuildIndex?: boolean;
}): Promise<{ domains: CommercialLiveDomain[] }> {
  const rebuild = opts?.rebuildIndex === true;
  if (rebuild) {
    return propagatePricingToCommercialNow({ rebuildIndex: true, includeStock: true });
  }

  const { invalidateAdminCaches } = await import('@/lib/services/admin-data-sync.service');
  await invalidateAdminCaches();
  try {
    const { invalidateSyncDiagnosticsCache } = await import('@/lib/services/sync.service');
    invalidateSyncDiagnosticsCache();
  } catch {
    /* best-effort */
  }
  try {
    const { advanceKpiWatermark } = await import('@/lib/kpi/invalidation-map');
    advanceKpiWatermark();
  } catch {
    /* best-effort */
  }
  return { domains: [...STOCK_LIVE_DOMAINS] };
}
