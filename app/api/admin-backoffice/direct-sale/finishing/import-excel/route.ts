export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { safeErrorMessage } from '@/lib/api-response';
import { importFinishingFromExcel } from '@/lib/server/modules/direct-sale/pricing-tables.service';

export const POST = withAuthApi(
  'finishing import',
  async (auth, req) => {
    try {
      const body = (await req.json()) as { rows?: Record<string, unknown>[] };
      const rows = Array.isArray(body.rows) ? body.rows : [];
      if (!rows.length) {
        return NextResponse.json({ ok: false, error: { message: 'Aucune ligne', code: 'EMPTY' } }, { status: 400 });
      }
      const report = await importFinishingFromExcel(rows, auth);
      return NextResponse.json({ ok: true, data: report });
    } catch (e) {
      return NextResponse.json({ ok: false, error: { message: safeErrorMessage(e, 'Import impossible') } }, { status: 500 });
    }
  },
  { anyPermissions: ['tarifs:write'] },
);
