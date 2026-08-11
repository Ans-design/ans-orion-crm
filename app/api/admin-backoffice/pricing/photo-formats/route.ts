export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission, requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import {
  listPhotoFormatEquivalences,
  patchPhotoFormatEquivalence,
  importPhotoFormatEquivalencesFromExcel,
  photoFormatEquivalenceToExcelRow,
  ensurePhotoFormatEquivalencesReady,
  PHOTO_FORMAT_EXCEL_COLUMNS,
} from '@/lib/services/photo-format-equivalences-sync.service';

export async function GET(req: NextRequest) {
  const auth = await requireAnyPermission('config:view', 'tarifs:read');
  if ('error' in auth) return auth.error;
  try {
    await ensurePhotoFormatEquivalencesReady();
    const action = new URL(req.url).searchParams.get('action');
    const rows = await listPhotoFormatEquivalences();
    if (action === 'export') {
      return NextResponse.json({
        ok: true,
        data: {
          rows: rows.map((r) => photoFormatEquivalenceToExcelRow(r)),
          columns: PHOTO_FORMAT_EXCEL_COLUMNS,
        },
      });
    }
    return NextResponse.json({
      ok: true,
      data: { rows, columns: PHOTO_FORMAT_EXCEL_COLUMNS },
    });
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
      const report = await importPhotoFormatEquivalencesFromExcel(
        body.rows as Record<string, unknown>[],
      );
      return NextResponse.json({ ok: true, data: report });
    }
    if (body.action === 'sync') {
      await ensurePhotoFormatEquivalencesReady();
      return NextResponse.json({ ok: true, data: { synced: true } });
    }
    return NextResponse.json(
      { ok: false, error: { message: 'Action invalide', code: 'VALIDATION' } },
      { status: 400 },
    );
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
      return NextResponse.json(
        { ok: false, error: { message: 'id requis', code: 'VALIDATION' } },
        { status: 400 },
      );
    }
    const patch: Record<string, unknown> = {};
    if (body.displayLabel) patch.displayLabel = String(body.displayLabel);
    if (body.billingFormat) patch.billingFormat = String(body.billingFormat);
    if (body.widthMm != null) patch.widthMm = Number(body.widthMm);
    if (body.heightMm != null) patch.heightMm = Number(body.heightMm);
    if (body.billingWidthMm != null) patch.billingWidthMm = Number(body.billingWidthMm);
    if (body.billingHeightMm != null) patch.billingHeightMm = Number(body.billingHeightMm);
    if (body.category) patch.category = String(body.category);
    if (body.visiblePOS !== undefined) patch.visiblePOS = body.visiblePOS === true;
    if (body.active !== undefined) patch.active = body.active === true;
    if (body.isAlias !== undefined) patch.isAlias = body.isAlias === true;
    if (body.details !== undefined) patch.details = body.details ? String(body.details) : null;
    const row = await patchPhotoFormatEquivalence(id, patch);
    return NextResponse.json({ ok: true, data: row });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Erreur'), code: 'ERROR' } },
      { status: 500 },
    );
  }
}
