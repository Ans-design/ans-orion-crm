export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { publishBackofficeConfig } from '@/lib/server/modules/backoffice/backoffice-sync.service';
import { invalidateKpiCaches } from '@/lib/services/kpi-cache-invalidation';

export async function POST() {
  const auth = await requirePermission('config:publish');
  if ('error' in auth) return auth.error;

  try {
    const result = await publishBackofficeConfig(auth.userId, auth.userName);
    invalidateKpiCaches();
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    console.error('[backoffice/publish]', error);
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Publication impossible'), code: 'PUBLISH_ERROR' } },
      { status: 500 },
    );
  }
}
