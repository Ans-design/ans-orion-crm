export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { syncAdminToPOS } from '@/lib/services/admin-to-commercial-sync.service';
import { syncPricingMaterialsToPos } from '@/lib/server/modules/pricing/pricing-pos-sync.service';
import { invalidateSyncDiagnosticsCache } from '@/lib/services/sync.service';
import { propagatePricingToCommercialNow } from '@/lib/services/commercial-live-propagation.service';
import { jsonWithLiveDomains } from '@/lib/live/live-response';

/**
 * Sync Admin → POS complète (Centre synchronisation).
 * Orchestrateur V12 uniquement + matières (pas de double sync catalogue).
 */
export async function POST() {
  const auth = await requirePermission('config:publish');
  if ('error' in auth) return auth.error;

  try {
    const adminToPos = await syncAdminToPOS({
      userId: auth.userId,
      userName: auth.userName,
      full: true,
    });
    const materials = await syncPricingMaterialsToPos({
      publish: true,
      userId: auth.userId,
    });

    invalidateSyncDiagnosticsCache();
    const propagation = await propagatePricingToCommercialNow({ rebuildIndex: true });

    const ok = adminToPos.ok !== false;
    const syncStatus = adminToPos.syncStatus ?? (ok ? 'succeeded' : 'failed');

    return jsonWithLiveDomains(
      {
        ok,
        data: {
          syncStatus,
          runId: adminToPos.runId,
          adminToPos,
          materials,
          message:
            syncStatus === 'succeeded'
              ? adminToPos.message || 'Synchronisation Admin → POS terminée'
              : syncStatus === 'partial'
                ? `Sync partielle — ${adminToPos.stepErrors?.join(' · ') || adminToPos.message}`
                : `Sync échouée — ${adminToPos.stepErrors?.join(' · ') || adminToPos.message}`,
          commercialPropagated: true,
        },
      },
      propagation.domains,
    );
  } catch (error) {
    console.error('[admin-backoffice/sync-all]', error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: safeErrorMessage(error, 'Synchronisation complète impossible'),
          code: 'SYNC_ALL_ERROR',
        },
      },
      { status: 500 },
    );
  }
}
