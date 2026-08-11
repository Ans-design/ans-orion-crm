export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { importPackagingExcelSheets } from '@/lib/server/modules/packaging/packaging-admin.service';

export const POST = withAuthApi(
  'packaging import excel',
  async (auth, req: NextRequest) => {
    const body = (await req.json()) as {
      templates?: Record<string, unknown>[];
      margins?: Record<string, unknown>[];
      rules?: Record<string, unknown>[];
      sheets?: Record<string, Record<string, unknown>[]>;
    };
    const templates = body.templates
      ?? body.sheets?.['02_TYPES_BOITES']
      ?? body.sheets?.TYPES_BOITES
      ?? [];
    const margins = body.margins
      ?? body.sheets?.['05_MARGES_PACKAGING']
      ?? body.sheets?.MARGES_PACKAGING
      ?? [];
    const rules = body.rules
      ?? body.sheets?.['06_REGLES_CALCUL_PACKAGING']
      ?? body.sheets?.REGLES_CALCUL_PACKAGING
      ?? [];
    const result = await importPackagingExcelSheets({ templates, margins, rules });
    return NextResponse.json({ ok: true, ...result });
  },
  { anyPermissions: ['tarifs:write'] },
);
