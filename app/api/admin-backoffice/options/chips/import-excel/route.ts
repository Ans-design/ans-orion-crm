export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { safeErrorMessage } from '@/lib/api-response';
import {
  ensureChipsExcelRowIds,
  importChipsFromExcel,
} from '@/lib/server/modules/backoffice-v2/chips-excel-import.service';
import { notifyAdminModuleMutation } from '@/lib/services/admin-data-sync.service';

export const POST = withAuthApi(
  'options chips import-excel',
  async (auth, req) => {
    try {
      const body = (await req.json()) as {
        rows?: Record<string, unknown>[];
        fileName?: string;
        action?: string;
      };

      if (body.action === 'prepare-export') {
        const ids = await ensureChipsExcelRowIds();
        return NextResponse.json({ ok: true, data: ids });
      }

      const rows = Array.isArray(body.rows) ? body.rows : [];
      if (!rows.length) {
        return NextResponse.json(
          { ok: false, error: { message: 'Aucune ligne à importer', code: 'IMPORT_EMPTY' } },
          { status: 400 },
        );
      }

      const report = await importChipsFromExcel(rows, {
        userId: auth.userId,
        userName: auth.userName,
        fileName: body.fileName,
      });
      await notifyAdminModuleMutation('chips', {
        userId: auth.userId,
        userName: auth.userName,
        details: { import: report },
      });
      return NextResponse.json({ ok: true, data: report });
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: safeErrorMessage(error, 'Import Excel chips impossible'),
            code: 'CHIPS_IMPORT_ERROR',
          },
        },
        { status: 500 },
      );
    }
  },
  { permission: 'tarifs:write' },
);
