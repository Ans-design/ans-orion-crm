/**
 * Orchestrateur import Excel → base → sync POS Commercial.
 */
import { syncAdminToPOS } from '@/lib/services/admin-to-commercial-sync.service';
import { rebuildPOSPriceIndex } from '@/lib/services/pricing-data-sync.service';
import { notifyAdminModuleMutation } from '@/lib/services/admin-data-sync.service';
import { logAudit } from '@/lib/audit';

export type ExcelImportSyncOpts = {
  userId?: string;
  userName?: string;
  /** Domaine métier pour l’audit */
  domain?: string;
  /** Sync complète Admin→POS après import (défaut true) */
  syncPos?: boolean;
  /** Rebuild index prix seulement (plus léger) */
  pricesOnly?: boolean;
};

export type ExcelImportSyncResult<T = unknown> = {
  importResult: T;
  sync: Awaited<ReturnType<typeof syncAdminToPOS>> | { ok: true; pricesOnly: true } | null;
};

/**
 * Après un import métier réussi : invalide caches + sync POS.
 */
export async function afterExcelImport<T>(
  importResult: T,
  opts?: ExcelImportSyncOpts,
): Promise<ExcelImportSyncResult<T>> {
  let sync: ExcelImportSyncResult['sync'] = null;

  if (opts?.pricesOnly) {
    await rebuildPOSPriceIndex();
    await notifyAdminModuleMutation(opts.domain ?? 'excel-import', opts);
    sync = { ok: true, pricesOnly: true };
  } else if (opts?.syncPos !== false) {
    sync = await syncAdminToPOS({
      userId: opts?.userId,
      userName: opts?.userName,
      full: true,
    });
  } else {
    await notifyAdminModuleMutation(opts?.domain ?? 'excel-import', opts);
  }

  await logAudit({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'IMPORT',
    entity: 'ExcelImportSync',
    entityLabel: opts?.domain ?? 'excel',
    details: {
      domain: opts?.domain,
      syncMessage: sync && 'message' in sync ? sync.message : null,
    },
  });

  return { importResult, sync };
}

export const excelImportSyncService = {
  afterExcelImport,
  syncAdminToPOS,
};
