export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission, requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import {
  listTiragePhotoParams,
  patchTiragePhotoParam,
  importTiragePhotoFromExcel,
  tiragePhotoParamToExcelRows,
  ensureTiragePhotoParamsReady,
  TIRAGE_PHOTO_EXCEL_COLUMNS,
} from '@/lib/services/tirage-photo-sync.service';

export async function GET(req: NextRequest) {
  const auth = await requireAnyPermission('config:view', 'tarifs:read');
  if ('error' in auth) return auth.error;
  try {
    await ensureTiragePhotoParamsReady();
    const action = new URL(req.url).searchParams.get('action');
    const rows = await listTiragePhotoParams();
    if (action === 'export') {
      const excelRows = rows.flatMap((r) => tiragePhotoParamToExcelRows(r));
      return NextResponse.json({
        ok: true,
        data: { rows: excelRows, columns: TIRAGE_PHOTO_EXCEL_COLUMNS },
      });
    }
    return NextResponse.json({ ok: true, data: { rows, columns: TIRAGE_PHOTO_EXCEL_COLUMNS } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Erreur'), code: 'ERROR' } },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    if (body.action === 'import' && Array.isArray(body.rows)) {
      const report = await importTiragePhotoFromExcel(body.rows as Record<string, unknown>[]);
      return NextResponse.json({ ok: true, data: report });
    }
    if (body.action === 'sync') {
      await ensureTiragePhotoParamsReady();
      return NextResponse.json({ ok: true, data: { synced: true } });
    }
    return NextResponse.json({ ok: false, error: { message: 'Action invalide', code: 'VALIDATION' } }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Erreur'), code: 'ERROR' } },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const id = String(body.id ?? '');
    if (!id) {
      return NextResponse.json({ ok: false, error: { message: 'id requis', code: 'VALIDATION' } }, { status: 400 });
    }
    const patch: Record<string, unknown> = {};
    if (body.prixBaseA4 != null) patch.prixBaseA4 = Number(body.prixBaseA4);
    if (body.visiblePOS !== undefined) patch.visiblePOS = body.visiblePOS === true;
    if (body.active !== undefined) patch.active = body.active === true;
    if (body.details !== undefined) patch.details = body.details ? String(body.details) : null;
    if (body.label) patch.label = String(body.label);
    const row = await patchTiragePhotoParam(id, patch);
    return NextResponse.json({ ok: true, data: row });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Erreur'), code: 'ERROR' } },
      { status: 500 },
    );
  }
}
