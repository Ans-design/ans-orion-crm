export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission, requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import {
  listCarnetAutocopiantParams,
  patchCarnetAutocopiantParam,
  importCarnetParamsFromExcel,
  carnetParamToExcelRow,
  ensureCarnetAutocopiantParamsReady,
  CARNET_EXCEL_COLUMNS,
} from '@/lib/services/carnet-autocopiant-sync.service';

export async function GET(req: NextRequest) {
  const auth = await requireAnyPermission('config:view', 'tarifs:read');
  if ('error' in auth) return auth.error;
  try {
    await ensureCarnetAutocopiantParamsReady();
    const action = new URL(req.url).searchParams.get('action');
    const rows = await listCarnetAutocopiantParams();
    if (action === 'export') {
      return NextResponse.json({
        ok: true,
        data: { rows: rows.map((r) => carnetParamToExcelRow(r)), columns: CARNET_EXCEL_COLUMNS },
      });
    }
    return NextResponse.json({ ok: true, data: { rows, columns: CARNET_EXCEL_COLUMNS } });
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
      const report = await importCarnetParamsFromExcel(body.rows as Record<string, unknown>[]);
      return NextResponse.json({ ok: true, data: report });
    }
    if (body.action === 'sync') {
      await ensureCarnetAutocopiantParamsReady();
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
    for (const k of [
      'prixA4Nb', 'prixA4Quadri', 'numerotationArPerPage', 'reliureAr',
      'perforationArPerA4', 'couverture300gA3RectoAr', 'wastePct',
    ] as const) {
      if (body[k] != null) patch[k] = Number(body[k]);
    }
    if (body.active !== undefined) patch.active = body.active === true;
    if (body.visiblePOS !== undefined) patch.visiblePOS = body.visiblePOS === true;
    if (body.details !== undefined) patch.details = body.details ? String(body.details) : null;
    if (body.label) patch.label = String(body.label);
    const row = await patchCarnetAutocopiantParam(id, patch);
    return NextResponse.json({ ok: true, data: row });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Erreur'), code: 'ERROR' } },
      { status: 500 },
    );
  }
}
