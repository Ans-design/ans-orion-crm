export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { runPricingSyncAudit } from '@/lib/server/modules/backoffice-v2/pricing-sync-audit.service';

export async function GET() {
  const auth = await requirePermission('tarifs:read');
  if ('error' in auth) return auth.error;

  try {
    const report = await runPricingSyncAudit();
    return NextResponse.json({ ok: true, data: report });
  } catch (error) {
    console.error('[admin-backoffice/pricing/audit]', error);
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Audit indisponible'), code: 'AUDIT_ERROR' } },
      { status: 500 },
    );
  }
}
