export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAnyPermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { exportDirectSaleTiersToExcelRows } from '@/lib/server/modules/direct-sale/direct-sale.service';

export async function GET() {
  const auth = await requireAnyPermission('config:view', 'tarifs:read');
  if ('error' in auth) return auth.error;

  try {
    const rows = await exportDirectSaleTiersToExcelRows();
    return NextResponse.json({ ok: true, data: { rows } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Export impossible'), code: 'EXPORT_ERROR' } },
      { status: 500 },
    );
  }
}
