export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { ignoreSyncDriftAlert } from '@/lib/services/sync-drift-service';
import { invalidateSyncDiagnosticsCache } from '@/lib/services/sync.service';
import { safeErrorMessage } from '@/lib/api-response';

export async function POST(req: Request) {
  const auth = await requirePermission('config:publish');
  if ('error' in auth) return auth.error;

  try {
    const body = (await req.json().catch(() => ({}))) as {
      alertId?: unknown;
      hours?: unknown;
    };
    const alertId = typeof body.alertId === 'string' ? body.alertId.trim() : '';
    if (!alertId) {
      return NextResponse.json({ ok: false, error: 'alertId requis' }, { status: 400 });
    }
    const hours =
      typeof body.hours === 'number' && Number.isFinite(body.hours) ? body.hours : 24;
    const result = await ignoreSyncDriftAlert(alertId, hours);
    invalidateSyncDiagnosticsCache();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, 'Impossible d’ignorer l’alerte') },
      { status: 503 },
    );
  }
}
