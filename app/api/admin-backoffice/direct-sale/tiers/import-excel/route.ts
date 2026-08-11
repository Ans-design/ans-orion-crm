export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { safeErrorMessage } from '@/lib/api-response';
import { importDirectSaleTiersFromExcel } from '@/lib/server/modules/direct-sale/direct-sale.service';

export const POST = withAuthApi(
  'direct-sale tiers import-excel',
  async (auth, req) => {
    try {
      const body = (await req.json()) as { rows?: Record<string, unknown>[] };
      const rows = Array.isArray(body.rows) ? body.rows : [];
      if (!rows.length) {
        return NextResponse.json(
          { ok: false, error: { message: 'Aucune ligne', code: 'IMPORT_EMPTY' } },
          { status: 400 },
        );
      }
      const report = await importDirectSaleTiersFromExcel(rows, {
        userId: auth.userId,
        userName: auth.userName,
      });
      return NextResponse.json({ ok: true, data: report });
    } catch (error) {
      return NextResponse.json(
        { ok: false, error: { message: safeErrorMessage(error, 'Import paliers impossible'), code: 'IMPORT_ERROR' } },
        { status: 500 },
      );
    }
  },
  { anyPermissions: ['tarifs:write'] },
);
