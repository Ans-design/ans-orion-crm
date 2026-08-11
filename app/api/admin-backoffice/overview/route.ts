export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { getAdminBackofficeOverview } from '@/lib/server/modules/backoffice-v2/admin-backoffice.service';

export async function GET() {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;

  try {
    const data = await getAdminBackofficeOverview();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error('[admin-backoffice/overview]', error);
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Vue globale indisponible'), code: 'OVERVIEW_ERROR' } },
      { status: 503 },
    );
  }
}
