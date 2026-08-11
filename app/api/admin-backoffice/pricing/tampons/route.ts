export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission, requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import {
  listStampFormats,
  patchStampFormat,
  importStampFormatsFromExcel,
  stampFormatToExcelRow,
  ensureStampFormatsReady,
  STAMP_EXCEL_COLUMNS,
} from '@/lib/services/stamp-formats-sync.service';

export async function GET(req: NextRequest) {
  const auth = await requireAnyPermission('config:view', 'tarifs:read');
  if ('error' in auth) return auth.error;
  try {
    await ensureStampFormatsReady();
    const action = new URL(req.url).searchParams.get('action');
    const rows = await listStampFormats();
    if (action === 'export') {
      return NextResponse.json({
        ok: true,
        data: { rows: rows.map((r) => stampFormatToExcelRow(r)), columns: STAMP_EXCEL_COLUMNS },
      });
    }
    return NextResponse.json({ ok: true, data: { rows, columns: STAMP_EXCEL_COLUMNS } });
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
      const report = await importStampFormatsFromExcel(body.rows as Record<string, unknown>[]);
      return NextResponse.json({ ok: true, data: report });
    }
    if (body.action === 'sync') {
      await ensureStampFormatsReady();
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
    if (body.unitPrice != null) patch.unitPrice = Number(body.unitPrice);
    if (body.widthMm != null) patch.widthMm = Number(body.widthMm);
    if (body.heightMm != null) patch.heightMm = Number(body.heightMm);
    if (body.stampType) patch.stampType = String(body.stampType);
    if (body.formatLabel) patch.formatLabel = String(body.formatLabel);
    if (body.reference !== undefined) patch.reference = body.reference ? String(body.reference) : null;
    if (body.visiblePOS !== undefined) patch.visiblePOS = body.visiblePOS === true;
    if (body.allowCustomFormat !== undefined) patch.allowCustomFormat = body.allowCustomFormat === true;
    if (body.status) patch.status = String(body.status);
    if (body.details !== undefined) patch.details = body.details ? String(body.details) : null;
    const row = await patchStampFormat(id, patch);
    return NextResponse.json({ ok: true, data: row });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Erreur'), code: 'ERROR' } },
      { status: 500 },
    );
  }
}
