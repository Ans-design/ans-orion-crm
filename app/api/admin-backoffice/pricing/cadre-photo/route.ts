export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission, requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import {
  listBlankFrames,
  listCadrePhotoRules,
  patchBlankFrame,
  patchCadrePhotoRule,
  importBlankFramesFromExcel,
  importCadreRulesFromExcel,
  blankFrameToExcelRow,
  cadreRuleToExcelRows,
  ensureCadrePhotoReady,
  CADRES_VIERGES_COLUMNS,
  CADRE_PHOTO_REGLES_COLUMNS,
} from '@/lib/services/cadre-photo-sync.service';

export async function GET(req: NextRequest) {
  const auth = await requireAnyPermission('config:view', 'tarifs:read');
  if ('error' in auth) return auth.error;
  try {
    await ensureCadrePhotoReady();
    const action = new URL(req.url).searchParams.get('action');
    const frames = await listBlankFrames();
    const rules = await listCadrePhotoRules();
    if (action === 'export') {
      return NextResponse.json({
        ok: true,
        data: {
          framesExcel: frames.map((r) => blankFrameToExcelRow(r)),
          rulesExcel: rules.flatMap((r) => cadreRuleToExcelRows(r)),
          columnsFrames: CADRES_VIERGES_COLUMNS,
          columnsRules: CADRE_PHOTO_REGLES_COLUMNS,
        },
      });
    }
    return NextResponse.json({
      ok: true,
      data: { frames, rules, columnsFrames: CADRES_VIERGES_COLUMNS },
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
    if (body.action === 'import-frames' && Array.isArray(body.rows)) {
      const report = await importBlankFramesFromExcel(body.rows as Record<string, unknown>[]);
      return NextResponse.json({ ok: true, data: report });
    }
    if (body.action === 'import-rules' && Array.isArray(body.rows)) {
      const report = await importCadreRulesFromExcel(body.rows as Record<string, unknown>[]);
      return NextResponse.json({ ok: true, data: report });
    }
    if (body.action === 'sync') {
      await ensureCadrePhotoReady();
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
    if (body.entity === 'rule') {
      const patch: Record<string, unknown> = {};
      if (body.optionalSupplement != null) patch.optionalSupplement = Number(body.optionalSupplement);
      if (body.usesTiragePhoto !== undefined) patch.usesTiragePhoto = body.usesTiragePhoto === true;
      if (body.visiblePOS !== undefined) patch.visiblePOS = body.visiblePOS === true;
      const row = await patchCadrePhotoRule(id, patch);
      return NextResponse.json({ ok: true, data: row });
    }
    const patch: Record<string, unknown> = {};
    if (body.unitPrice != null) patch.unitPrice = Number(body.unitPrice);
    if (body.frameType) patch.frameType = String(body.frameType);
    if (body.formatLabel) patch.formatLabel = String(body.formatLabel);
    if (body.visiblePOS !== undefined) patch.visiblePOS = body.visiblePOS === true;
    if (body.status) patch.status = String(body.status);
    const row = await patchBlankFrame(id, patch);
    return NextResponse.json({ ok: true, data: row });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Erreur'), code: 'ERROR' } },
      { status: 500 },
    );
  }
}
