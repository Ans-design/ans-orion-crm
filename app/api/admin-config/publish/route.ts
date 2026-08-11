export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { withAuthApi, type AuthApiContext } from '@/lib/server/auth/with-auth-api';
import { apiError } from '@/lib/api-response';
import { publishDraftConfig } from '@/lib/services/admin-config';
import { syncBackofficeCatalog } from '@/lib/server/modules/backoffice/backoffice-sync.service';
import { runFullSyncDriftAnalysis, summarizeSyncDriftReport } from '@/lib/services/sync-drift-service';
import { invalidateKpiCaches } from '@/lib/services/kpi-cache-invalidation';
import { invalidateSyncDiagnosticsCache } from '@/lib/services/sync.service';

export const POST = withAuthApi(
  'admin-config publish',
  async (auth: AuthApiContext) => {
    const result = await publishDraftConfig(auth.userId, auth.userName);
    const catalogSync = await syncBackofficeCatalog().catch(() => null);
    invalidateKpiCaches();
    invalidateSyncDiagnosticsCache();
    let driftSummary = null;
    try {
      const driftReport = await runFullSyncDriftAnalysis();
      driftSummary = summarizeSyncDriftReport(driftReport);
    } catch {
      /* drift non bloquant après publication */
    }
    return NextResponse.json({ ...result, catalogSync, driftSummary });
  },
  { permission: 'config:publish' },
);
