export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { safeErrorMessage } from '@/lib/api-response';
import { importMaterialsFromExcel } from '@/lib/server/modules/materials/materials-excel-import.service';
import {
  invalidateAdminCaches,
  propagateAllPublishedMaterialPrices,
} from '@/lib/services/admin-data-sync.service';

export async function handleMaterialsExcelImport(
  req: NextRequest,
  auth: { userId?: string; userName?: string },
) {
  const body = (await req.json()) as {
    rows?: Record<string, unknown>[];
    fileName?: string;
    syncMode?: 'full' | 'upsert';
    replaceAll?: boolean;
  };
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (!rows.length) {
    return NextResponse.json(
      { ok: false, error: { message: 'Aucune ligne à importer', code: 'IMPORT_EMPTY' } },
      { status: 400 },
    );
  }

  const report = await importMaterialsFromExcel(rows, {
    userId: auth.userId,
    userName: auth.userName,
    fileName: body.fileName,
    syncMode: body.syncMode === 'upsert' ? 'upsert' : (body.syncMode ?? 'full'),
    replaceAll: body.syncMode === 'upsert' ? false : body.replaceAll === true,
  });

  await propagateAllPublishedMaterialPrices({
    userId: auth.userId,
    userName: auth.userName,
  });
  await invalidateAdminCaches();

  /* Sync automatique Admin → POS / commercial */
  try {
    const { afterExcelImport } = await import('@/lib/services/excel-import-sync.service');
    await afterExcelImport(report, {
      userId: auth.userId,
      userName: auth.userName,
      domain: 'matieres',
      syncPos: true,
    });
  } catch {
    /* client peut relancer Sync POS */
  }

  return NextResponse.json({ ok: true, data: report });
}

export const POST = withAuthApi(
  'base-materials import',
  async (auth, req) => {
    try {
      return await handleMaterialsExcelImport(req, auth);
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: safeErrorMessage(error, 'Import Excel impossible'),
            code: 'MATERIAL_IMPORT_ERROR',
          },
        },
        { status: 500 },
      );
    }
  },
  { anyPermissions: ['tarifs:write', 'config:edit_price', 'config:publish'] },
);
