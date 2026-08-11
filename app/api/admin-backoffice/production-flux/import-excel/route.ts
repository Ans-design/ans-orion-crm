export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { safeErrorMessage } from '@/lib/api-response';
import { importProductionFluxFromExcel } from '@/lib/server/modules/production-flux-excel-import.service';

export const POST = withAuthApi(
  'production-flux import-excel',
  async (auth, req) => {
    try {
      const body = (await req.json()) as { rows?: Record<string, unknown>[] };
      const rows = Array.isArray(body.rows) ? body.rows : [];
      if (!rows.length) {
        return NextResponse.json(
          { ok: false, error: { message: 'Aucune ligne à importer', code: 'IMPORT_EMPTY' } },
          { status: 400 },
        );
      }
      const report = await importProductionFluxFromExcel(rows, { userId: auth.userId });
      return NextResponse.json({ ok: true, data: report });
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: safeErrorMessage(error, 'Import Excel production flux impossible'),
            code: 'FLUX_IMPORT_ERROR',
          },
        },
        { status: 500 },
      );
    }
  },
  { permission: 'tarifs:write' },
);
