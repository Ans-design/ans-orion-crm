export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { listBackofficeAuditLog } from '@/lib/server/modules/backoffice/backoffice.service';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;

  try {
    const limit = Number(new URL(req.url).searchParams.get('limit') ?? 80);
    const data = await listBackofficeAuditLog(limit);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error('[backoffice/audit-log]', error);
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Historique indisponible'), code: 'AUDIT_ERROR' } },
      { status: 503 },
    );
  }
}
