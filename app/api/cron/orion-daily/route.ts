export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { expireOverdueDevis, notifyDevisExpirationWarnings } from '@/lib/services/devis-expiration-service';
import { notifyInactiveClientAlerts } from '@/lib/services/client-relance-service';
import { notifySyncDriftIfNeeded } from '@/lib/services/sync-drift-service';
import { runApiHandler } from '@/lib/api-guard';

function assertCronAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET non configuré' }, { status: 503 });
  }
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  return null;
}

/** Job quotidien ORION — expiration devis + relances clients inactifs. */
export async function POST(req: NextRequest) {
  const denied = assertCronAuth(req);
  if (denied) return denied;

  return runApiHandler('cron/orion-daily POST', async () => {
    const [expired, warnings, inactive, syncDrift] = await Promise.all([
      expireOverdueDevis(),
      notifyDevisExpirationWarnings(),
      notifyInactiveClientAlerts(),
      notifySyncDriftIfNeeded(),
    ]);
    let outbox = { claimed: 0, succeeded: 0, failed: 0, dead: 0 };
    try {
      const { ensureOutboxHandlersRegistered } = await import('@/lib/server/outbox-handlers');
      ensureOutboxHandlersRegistered();
      const { processOutboxBatch } = await import('@/lib/server/outbox-worker');
      outbox = await processOutboxBatch({ workerId: 'orion-daily', limit: 15 });
    } catch (e) {
      console.warn('[cron/orion-daily] outbox', e);
    }
    return NextResponse.json({
      ok: true,
      expired,
      warnings,
      inactive,
      outbox,
      syncDrift: {
        notified: syncDrift.notified,
        score: syncDrift.report.totalScore,
        alertCount: syncDrift.report.alerts.length,
      },
    });
  });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
