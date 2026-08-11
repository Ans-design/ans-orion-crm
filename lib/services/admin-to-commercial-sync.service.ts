/**
 * Orchestrateur Admin → POS Commercial.
 * Ne duplique pas les moteurs : délègue aux services existants puis invalide les caches.
 * V12 : SyncRun durable + verdict honnête (ok false si étape critique échoue).
 */
import { logAudit } from '@/lib/audit';
import { notifyAdminModuleMutation } from '@/lib/services/admin-data-sync.service';
import { syncCatalogueProfilesToDb } from '@/lib/services/catalogue-sync-service';
import { syncArticleOptionsToPOS } from '@/lib/services/catalog-options-sync.service';
import { rebuildPOSPriceIndex, detectPricingDrift } from '@/lib/services/pricing-data-sync.service';
import { detectCatalogDuplicates } from '@/lib/services/detect-catalog-duplicates.service';
import { syncAllPublishedDirectSaleToPos } from '@/lib/services/direct-sale-pos-sync.service';
import { completeSyncStep, createSyncRun, finalizeSyncRun } from '@/lib/server/sync-run';

export type AdminToCommercialSyncOpts = {
  userId?: string;
  userName?: string;
  /** Si false, saute les merges / syncs lourds (défaut true). */
  full?: boolean;
  /** Sync chips goodies / options (défaut true). */
  options?: boolean;
  /** Sync articles vente directe (défaut true). */
  directSale?: boolean;
  /** Rebuild index prix MaterialContextPrice (défaut true). */
  prices?: boolean;
};

export type AdminToCommercialSyncReport = {
  ok: boolean;
  runId?: string;
  syncStatus?: 'succeeded' | 'partial' | 'failed';
  catalogue: Awaited<ReturnType<typeof syncCatalogueProfilesToDb>> | null;
  options: Awaited<ReturnType<typeof syncArticleOptionsToPOS>> | null;
  directSale: Awaited<ReturnType<typeof syncAllPublishedDirectSaleToPos>> | null;
  priceIndex: Awaited<ReturnType<typeof rebuildPOSPriceIndex>> | null;
  catalogDuplicates: Awaited<ReturnType<typeof detectCatalogDuplicates>> | null;
  categoryCounters: number;
  posTotalArticles: number | null;
  pricingDrifts: number;
  message: string;
  stepErrors?: string[];
};

/** Alias brief métier */
export async function syncAdminToPOS(
  opts?: AdminToCommercialSyncOpts,
): Promise<AdminToCommercialSyncReport> {
  return adminToCommercialSyncService.syncAll(opts);
}

/** Alias brief métier — sync Admin fusionné → POS Commercial */
export async function syncAdminToCommercialPOS(
  opts?: AdminToCommercialSyncOpts,
): Promise<AdminToCommercialSyncReport> {
  return syncAdminToPOS(opts);
}

export async function syncPricesToPOS(opts?: AdminToCommercialSyncOpts) {
  const priceIndex = await rebuildPOSPriceIndex();
  await notifyAdminModuleMutation('pricing', opts);
  return priceIndex;
}

export async function syncMaterialsToPOS(opts?: AdminToCommercialSyncOpts) {
  return syncPricesToPOS(opts);
}

export async function syncCategoriesToPOS(opts?: AdminToCommercialSyncOpts) {
  const catalogue = await syncCatalogueProfilesToDb();
  await notifyAdminModuleMutation('catalogue-categories', opts);
  return catalogue;
}

export async function syncChipsToPOS(articleId?: string, opts?: AdminToCommercialSyncOpts) {
  return syncArticleOptionsToPOS(articleId, opts);
}

export async function invalidatePOSCache(opts?: AdminToCommercialSyncOpts) {
  await notifyAdminModuleMutation('pos-cache', opts);
}

export async function createAuditLog(input: {
  userId?: string;
  userName?: string;
  action: string;
  entity: string;
  entityLabel?: string;
  details?: unknown;
}) {
  await logAudit({
    userId: input.userId,
    userName: input.userName,
    action: input.action,
    entity: input.entity,
    entityLabel: input.entityLabel,
    details: input.details as Record<string, unknown> | undefined,
  });
}

export const adminToCommercialSyncService = {
  async syncAll(opts?: AdminToCommercialSyncOpts): Promise<AdminToCommercialSyncReport> {
    const full = opts?.full !== false;
    const doOptions = opts?.options !== false;
    const doDirectSale = opts?.directSale !== false;
    const doPrices = opts?.prices !== false;

    const stepKeys = [
      ...(full ? ['catalogue'] : []),
      ...(doOptions ? ['options'] : []),
      ...(doDirectSale ? ['directSale'] : []),
      ...(doPrices ? ['priceIndex'] : []),
      'diagnostics',
    ];

    let runId: string | undefined;
    try {
      const created = await createSyncRun({
        type: 'admin-to-commercial',
        scope: 'pos',
        requestedBy: opts?.userId,
        stepKeys,
      });
      runId = created.runId;
    } catch (e) {
      console.warn('[adminToCommercialSync] SyncRun unavailable', e);
    }

    const stepErrors: string[] = [];
    const mark = async (stepKey: string, ok: boolean, err?: unknown) => {
      if (!ok) {
        const msg = err instanceof Error ? err.message : String(err ?? 'failed');
        stepErrors.push(`${stepKey}: ${msg}`);
      }
      if (!runId) return;
      try {
        await completeSyncStep(runId, stepKey, {
          ok,
          errorMsg: ok ? undefined : stepErrors[stepErrors.length - 1],
          errorCode: ok ? undefined : 'STEP_FAILED',
        });
      } catch {
        /* SyncRunStep optional if table missing */
      }
    };

    let catalogue: AdminToCommercialSyncReport['catalogue'] = null;
    let options: AdminToCommercialSyncReport['options'] = null;
    let directSale: AdminToCommercialSyncReport['directSale'] = null;
    let priceIndex: AdminToCommercialSyncReport['priceIndex'] = null;

    if (full) {
      try {
        const { runPosCatalogueMaintenance } = await import('@/lib/services/catalogue-service');
        await runPosCatalogueMaintenance({ force: true });
        catalogue = await syncCatalogueProfilesToDb();
        await mark('catalogue', true);
      } catch (e) {
        console.warn('[adminToCommercialSync] catalogue', e);
        await mark('catalogue', false, e);
      }
    }
    if (doOptions) {
      try {
        options = await syncArticleOptionsToPOS(undefined, opts);
        try {
          const { syncChipsDependenciesToGeneric } = await import(
            '@/lib/services/option-dependency.service'
          );
          await syncChipsDependenciesToGeneric();
        } catch (e) {
          console.warn('[adminToCommercialSync] optionDependency', e);
        }
        try {
          const { mergeDuplicateFormatOptions } = await import(
            '@/lib/services/merge-duplicate-format-options.service'
          );
          await mergeDuplicateFormatOptions({
            userId: opts?.userId,
            userName: opts?.userName,
          });
        } catch (e) {
          console.warn('[adminToCommercialSync] formatDedupe', e);
        }
        await mark('options', true);
      } catch (e) {
        console.warn('[adminToCommercialSync] options', e);
        await mark('options', false, e);
      }
    }
    if (doDirectSale) {
      try {
        directSale = await syncAllPublishedDirectSaleToPos(opts);
        await mark('directSale', true);
      } catch (e) {
        console.warn('[adminToCommercialSync] directSale', e);
        await mark('directSale', false, e);
      }
    }
    if (doPrices) {
      try {
        priceIndex = await rebuildPOSPriceIndex();
        await mark('priceIndex', true);
      } catch (e) {
        console.warn('[adminToCommercialSync] priceIndex', e);
        await mark('priceIndex', false, e);
      }
    }

    const [catalogDuplicates, drifts, categoryCounters] = await Promise.all([
      detectCatalogDuplicates().catch(() => null),
      detectPricingDrift().catch(() => []),
      import('@/lib/services/pos-catalog-index.service')
        .then((m) => m.recalculateCategoryCounters())
        .catch(() => []),
    ]);
    await mark('diagnostics', true);

    let posTotalArticles: number | null = null;
    try {
      const { getPosCatalogue } = await import('@/lib/services/catalogue-service');
      const payload = await getPosCatalogue('commercial');
      posTotalArticles = payload.items?.length ?? 0;
    } catch {
      posTotalArticles = null;
    }

    await notifyAdminModuleMutation('admin-to-commercial', {
      userId: opts?.userId,
      userName: opts?.userName,
      details: {
        catalogueOk: Boolean(catalogue),
        optionsArticles: options?.articles?.length ?? 0,
        directSale: directSale ?? null,
        priceIndex: priceIndex ?? null,
        duplicateCritical: catalogDuplicates?.critical ?? null,
        pricingDrifts: drifts.length,
        posTotalArticles,
        categoryCounters: categoryCounters.length,
        stepErrors,
        runId,
      },
    });

    await createAuditLog({
      userId: opts?.userId,
      userName: opts?.userName,
      action: 'SYNC',
      entity: 'AdminToCommercial',
      entityLabel: 'syncAdminToPOS',
      details: {
        catalogue,
        options,
        duplicateCritical: catalogDuplicates?.critical,
        pricingDrifts: drifts.length,
        posTotalArticles,
        stepErrors,
        runId,
      },
    });

    let syncStatus: 'succeeded' | 'partial' | 'failed' = 'succeeded';
    if (runId) {
      try {
        const fin = await finalizeSyncRun(runId);
        syncStatus = fin.status === 'succeeded' ? 'succeeded' : fin.status === 'failed' ? 'failed' : 'partial';
      } catch {
        syncStatus = stepErrors.length ? 'partial' : 'succeeded';
      }
    } else if (stepErrors.length) {
      syncStatus = 'partial';
    }

    const critical = catalogDuplicates?.critical ?? 0;
    const ok = syncStatus === 'succeeded';
    const message = !ok
      ? `Sync ${syncStatus.toUpperCase()} — ${stepErrors.length} étape(s) en erreur`
      : critical > 0
        ? `Sync OK — ${posTotalArticles ?? '?'} articles POS, ${critical} doublon(s) critique(s)`
        : `Sync Admin → POS Commercial terminée (${posTotalArticles ?? '?'} articles)`;

    return {
      ok,
      runId,
      syncStatus,
      catalogue,
      options,
      directSale,
      priceIndex,
      catalogDuplicates,
      categoryCounters: categoryCounters.length,
      posTotalArticles,
      pricingDrifts: drifts.length,
      message,
      stepErrors: stepErrors.length ? stepErrors : undefined,
    };
  },

  syncAdminToPOS,
  syncPricesToPOS,
  syncMaterialsToPOS,
  syncCategoriesToPOS,
  syncChipsToPOS,
  invalidatePOSCache,
  detectCatalogDuplicates,
  detectPricingDrift,
  createAuditLog,
  async rebuildPOSCatalogIndex(opts?: AdminToCommercialSyncOpts) {
    const { rebuildPOSCatalogIndex } = await import('@/lib/services/pos-catalog-index.service');
    return rebuildPOSCatalogIndex(opts);
  },
  async recalculateCategoryCounters() {
    const { recalculateCategoryCounters } = await import('@/lib/services/pos-catalog-index.service');
    return recalculateCategoryCounters();
  },
};
