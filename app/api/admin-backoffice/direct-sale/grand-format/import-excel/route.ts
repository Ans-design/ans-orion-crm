export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { safeErrorMessage } from '@/lib/api-response';
import { importGrandFormatFromExcel } from '@/lib/server/modules/direct-sale/pricing-tables.service';

export const POST = withAuthApi('gf import', async (auth, req) => {
  try {
    const body = (await req.json()) as { rows?: Record<string, unknown>[] };
    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (!rows.length) return NextResponse.json({ ok: false, error: { message: 'Vide' } }, { status: 400 });
    return NextResponse.json({ ok: true, data: await importGrandFormatFromExcel(rows, auth) });
  } catch (e) { return NextResponse.json({ ok: false, error: { message: safeErrorMessage(e, 'Import') } }, { status: 500 }); }
}, { anyPermissions: ['tarifs:write'] });
