export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { syncBackofficeCatalog } from '@/lib/server/modules/backoffice/backoffice-sync.service';
import { logAudit } from '@/lib/audit';

export async function POST() {
  // Aligné publish / sync-pos pricing : config:publish (admin l’a) — V2-07
  const auth = await requirePermission('config:publish');
  if ('error' in auth) return auth.error;

  try {
    const result = await syncBackofficeCatalog({
      userId: auth.userId,
      userName: auth.userName,
    });
    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'SYNC',
      entity: 'ArticlePricingProfile',
      entityLabel: 'backoffice-sync',
      details: result,
    });
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    console.error('[backoffice/sync]', error);
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Synchronisation impossible'), code: 'SYNC_ERROR' } },
      { status: 503 },
    );
  }
}
