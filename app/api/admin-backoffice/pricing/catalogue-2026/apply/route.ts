export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { safeErrorMessage } from '@/lib/api-response';
import {
  applyCatalogue2026Prices,
  auditCatalogue2026FromUpload,
} from '@/lib/server/modules/pricing/catalogue-2026-drift.service';
import { parseCatalogue2026Buffer } from '@/lib/backoffice/catalogue-2026-excel-format';
import {
  invalidateAdminCaches,
  propagateAllPublishedMaterialPrices,
} from '@/lib/services/admin-data-sync.service';

export const POST = withAuthApi(
  'catalogue-2026 apply',
  async (auth, req: NextRequest) => {
    try {
      const body = (await req.json().catch(() => ({}))) as {
        useReference?: boolean;
        applyMaterials?: boolean;
        applyServices?: boolean;
        fileBase64?: string;
        fileName?: string;
      };

      let workbook;
      let fileName = body.fileName ?? 'catalogue-2026-prix-exacts.xlsx';

      if (body.fileBase64) {
        const buf = Buffer.from(body.fileBase64, 'base64');
        workbook = parseCatalogue2026Buffer(buf);
        await auditCatalogue2026FromUpload(buf, fileName);
      } else if (body.useReference !== false) {
        const { getCatalogue2026Workbook } = await import('@/lib/backoffice/catalogue-2026-excel-format');
        workbook = getCatalogue2026Workbook(true);
        fileName = 'docs/references/catalogue-2026-prix-exacts.xlsx';
      } else {
        return NextResponse.json(
          { ok: false, error: { message: 'Source invalide', code: 'INVALID_SOURCE' } },
          { status: 400 },
        );
      }

      const report = await applyCatalogue2026Prices({
        workbook,
        userId: auth.userId,
        userName: auth.userName,
        fileName,
        applyMaterials: body.applyMaterials !== false,
        applyServices: body.applyServices !== false,
      });

      await propagateAllPublishedMaterialPrices({
        userId: auth.userId,
        userName: auth.userName,
      });
      await invalidateAdminCaches();

      return NextResponse.json({ ok: true, data: report });
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: safeErrorMessage(error, 'Application Catalogue 2026 impossible'),
            code: 'CATALOGUE_2026_APPLY_ERROR',
          },
        },
        { status: 500 },
      );
    }
  },
  { anyPermissions: ['tarifs:write', 'config:edit_price', 'config:publish'] },
);
