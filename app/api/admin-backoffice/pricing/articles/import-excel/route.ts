export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { safeErrorMessage } from '@/lib/api-response';
import { importPricingArticlesFromExcel } from '@/lib/server/modules/backoffice-v2/pricing-articles-excel-import.service';
import { buildPricingArticlesExportRows } from '@/lib/server/modules/backoffice-v2/pricing-articles-excel-export.service';

export const POST = withAuthApi(
  'pricing-articles import-excel',
  async (auth, req) => {
    try {
      const body = (await req.json()) as {
        rows?: Record<string, unknown>[];
        fileName?: string;
        action?: string;
      };

      if (body.action === 'prepare-export') {
        const rows = await buildPricingArticlesExportRows();
        return NextResponse.json({ ok: true, data: { rows } });
      }

      const rows = Array.isArray(body.rows) ? body.rows : [];
      if (!rows.length) {
        return NextResponse.json(
          { ok: false, error: { message: 'Aucune ligne à importer', code: 'IMPORT_EMPTY' } },
          { status: 400 },
        );
      }
      const report = await importPricingArticlesFromExcel(rows, {
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
            message: safeErrorMessage(error, 'Import Excel prix articles impossible'),
            code: 'PRICING_IMPORT_ERROR',
          },
        },
        { status: 500 },
      );
    }
  },
  { permission: 'tarifs:write' },
);
