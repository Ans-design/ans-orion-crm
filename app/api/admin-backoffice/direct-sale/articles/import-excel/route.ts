export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { safeErrorMessage } from '@/lib/api-response';
import { importPrixArticlesFromExcel } from '@/lib/server/modules/direct-sale/prix-articles-import.service';

export const POST = withAuthApi(
  'direct-sale prix-articles import',
  async (auth, req: NextRequest) => {
    try {
      const body = (await req.json()) as { rows?: Record<string, unknown>[]; fileName?: string };
      const rows = body.rows ?? [];
      if (!rows.length) {
        return NextResponse.json(
          { ok: false, error: { message: 'Fichier Excel vide', code: 'VALIDATION' } },
          { status: 400 },
        );
      }

      const report = await importPrixArticlesFromExcel(rows, {
        userId: auth.userId,
        userName: auth.userName,
        fileName: body.fileName,
      });

      return NextResponse.json({ ok: true, data: report });
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error: { message: safeErrorMessage(error, 'Import impossible'), code: 'IMPORT_ERROR' },
        },
        { status: 500 },
      );
    }
  },
  { anyPermissions: ['tarifs:write', 'config:edit_price'] },
);
