export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { listBackofficeAuditLog } from '@/lib/server/modules/backoffice/backoffice.service';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;

  try {
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get('limit') ?? 120);
    const entity = url.searchParams.get('entity');
    const data = await listBackofficeAuditLog(limit, entity);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error('[admin-backoffice/audit-log]', error);
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Historique indisponible'), code: 'AUDIT_ERROR' } },
      { status: 503 },
    );
  }
}
