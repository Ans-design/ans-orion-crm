export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { repairPaymentDrift } from '@/lib/services/sync-drift-service';
import { invalidateSyncDiagnosticsCache } from '@/lib/services/sync.service';
import { safeErrorMessage } from '@/lib/api-response';

export async function POST() {
  const auth = await requirePermission('config:publish');
  if ('error' in auth) return auth.error;

  try {
    const result = await repairPaymentDrift();
    invalidateSyncDiagnosticsCache();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, 'Réparation paiements indisponible') },
      { status: 503 },
    );
  }
}
