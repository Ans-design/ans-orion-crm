export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { safeErrorMessage } from '@/lib/api-response';
import {
  ensureBusinessRuleExcelRowIds,
  importBusinessRulesFromExcel,
} from '@/lib/server/modules/regles/business-rules-excel-import.service';

export const POST = withAuthApi(
  'regles import-excel',
  async (auth, req) => {
    try {
      const body = (await req.json()) as {
        rows?: Record<string, unknown>[];
        fileName?: string;
        action?: string;
      };

      if (body.action === 'prepare-export') {
        const ids = await ensureBusinessRuleExcelRowIds();
        return NextResponse.json({ ok: true, data: ids });
      }

      const rows = Array.isArray(body.rows) ? body.rows : [];
      if (!rows.length) {
        return NextResponse.json(
          { ok: false, error: { message: 'Aucune ligne à importer', code: 'IMPORT_EMPTY' } },
          { status: 400 },
        );
      }

      const report = await importBusinessRulesFromExcel(rows, {
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
            message: safeErrorMessage(error, 'Import Excel règles métier impossible'),
            code: 'REGLES_IMPORT_ERROR',
          },
        },
        { status: 500 },
      );
    }
  },
  { permission: 'regles:write' },
);
