export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { safeErrorMessage } from '@/lib/api-response';
import {
  ensureMaterialExcelRowIds,
  ensureMaterialMainReferences,
  reorganizeMaterialExcelIds,
  type GenerateReferencesMode,
} from '@/lib/server/modules/materials/material-excel-metadata.service';
import { emptyMaterialExcelTemplate } from '@/lib/backoffice/material-excel-format';

async function handleExcelMetadataPost(req: NextRequest) {
  const body = (await req.json()) as { action?: string; mode?: GenerateReferencesMode };
  const action = body.action ?? 'prepare-export';

  if (action === 'prepare-export') {
    const ids = await ensureMaterialExcelRowIds();
    return NextResponse.json({
      ok: true,
      data: { excelRowIdsAssigned: ids.assigned, excelRowIdsPreserved: ids.preserved },
    });
  }

  if (action === 'generate-references') {
    const mode: GenerateReferencesMode = body.mode === 'all' ? 'all' : 'missing';
    const refs = await ensureMaterialMainReferences(mode);
    return NextResponse.json({ ok: true, data: { ...refs, mode } });
  }

  if (action === 'reorganize-ids') {
    const ids = await reorganizeMaterialExcelIds();
    return NextResponse.json({
      ok: true,
      data: {
        reassigned: ids.reassigned,
        assigned: ids.reassigned,
        preserved: ids.preserved,
      },
    });
  }

  return NextResponse.json(
    { ok: false, error: { message: 'Action inconnue', code: 'INVALID_ACTION' } },
    { status: 400 },
  );
}

export const POST = withAuthApi(
  'base-materials excel-metadata',
  async (_auth, req) => {
    try {
      return await handleExcelMetadataPost(req);
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: safeErrorMessage(error, 'Action Excel impossible'),
            code: 'EXCEL_METADATA_ERROR',
          },
        },
        { status: 500 },
      );
    }
  },
  { anyPermissions: ['tarifs:write', 'config:edit_price', 'config:publish'] },
);

export const GET = withAuthApi(
  'base-materials excel-metadata template',
  async () => {
    const rows = emptyMaterialExcelTemplate();
    return NextResponse.json({ ok: true, data: { rows } });
  },
  { anyPermissions: ['config:view', 'tarifs:read'] },
);
