export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { safeErrorMessage } from '@/lib/api-response';
import {
  ensureAnnexeExcelRowIds,
  importAnnexesFromExcel,
} from '@/lib/server/modules/annexes/annexes-excel-import.service';

export const POST = withAuthApi(
  'annexes import-excel',
  async (auth, req) => {
    try {
      const body = (await req.json()) as {
        rows?: Record<string, unknown>[];
        fileName?: string;
        action?: string;
      };

      if (body.action === 'prepare-export') {
        const ids = await ensureAnnexeExcelRowIds();
        return NextResponse.json({ ok: true, data: ids });
      }

      const rows = Array.isArray(body.rows) ? body.rows : [];
      if (!rows.length) {
        return NextResponse.json(
          { ok: false, error: { message: 'Aucune ligne à importer', code: 'IMPORT_EMPTY' } },
          { status: 400 },
        );
      }

      const report = await importAnnexesFromExcel(rows, {
        userId: auth.userId,
        userName: auth.userName,
        fileName: body.fileName,
      });
      return NextResponse.json({ ok: true, data: report });
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: safeErrorMessage(error, 'Import Excel annexes impossible'),
            code: 'ANNEXES_IMPORT_ERROR',
          },
        },
        { status: 500 },
      );
    }
  },
  { permission: 'users:manage' },
);
