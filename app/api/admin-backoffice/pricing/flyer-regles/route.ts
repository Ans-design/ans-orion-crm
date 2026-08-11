export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission, requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import {
  listFlyerPricingRules,
  patchFlyerPricingParams,
  importFlyerRulesFromExcel,
  flyerRulesToExcelRows,
  ensureFlyerPricingRuntimeReady,
  FLYER_REGLES_EXCEL_COLUMNS,
} from '@/lib/services/flyer-pricing-sync.service';
import { getFlyerRuntimeParams } from '@/lib/pricing/flyer-pricing-rules';

export async function GET(req: NextRequest) {
  const auth = await requireAnyPermission('config:view', 'tarifs:read');
  if ('error' in auth) return auth.error;
  try {
    await ensureFlyerPricingRuntimeReady();
    const action = new URL(req.url).searchParams.get('action');
    const rows = await listFlyerPricingRules();
    if (action === 'export') {
      return NextResponse.json({
        ok: true,
        data: {
          rows: flyerRulesToExcelRows(rows),
          columns: FLYER_REGLES_EXCEL_COLUMNS,
          sheet: 'FLYER_REGLES_PRIX',
          params: getFlyerRuntimeParams(),
        },
      });
    }
    return NextResponse.json({
      ok: true,
      data: { rows, columns: FLYER_REGLES_EXCEL_COLUMNS, params: getFlyerRuntimeParams() },
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
      const report = await importFlyerRulesFromExcel(body.rows as Record<string, unknown>[], {
        userId: auth.userId,
      });
      try {
        const { notifyAdminModuleMutation } = await import('@/lib/services/admin-data-sync.service');
        await notifyAdminModuleMutation('flyer-regles', {
          userId: auth.userId,
          userName: auth.userName,
          details: { action: 'import' },
        });
      } catch {
        /* best-effort */
      }
      return NextResponse.json({ ok: true, data: report });
    }
    if (body.action === 'sync') {
      const { forceSyncFlyerPricingRuntime } = await import(
        '@/lib/services/flyer-pricing-sync.service'
      );
      const params = await forceSyncFlyerPricingRuntime();
      try {
        const { notifyAdminModuleMutation } = await import('@/lib/services/admin-data-sync.service');
        await notifyAdminModuleMutation('flyer-regles', {
          userId: auth.userId,
          userName: auth.userName,
          details: { action: 'sync' },
        });
      } catch {
        /* best-effort */
      }
      return NextResponse.json({ ok: true, data: { synced: true, params } });
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
    const patch: Record<string, unknown> = {};
    if (body.prixPliA4 != null) patch.prixPliA4 = Number(body.prixPliA4);
    if (body.utilisePalier !== undefined) patch.utilisePalier = body.utilisePalier === true;
    if (body.visiblePos !== undefined) patch.visiblePos = body.visiblePos === true;
    if (body.actif !== undefined) patch.actif = body.actif === true;
    if (body.sourcePrixBase != null) patch.sourcePrixBase = String(body.sourcePrixBase);
    if (body.commentaire != null) patch.commentaire = String(body.commentaire);
    const params = await patchFlyerPricingParams(
      patch as Partial<import('@/lib/pricing/flyer-pricing-rules').FlyerPricingRuntimeParams>,
      { userId: auth.userId },
    );
    try {
      const { notifyAdminModuleMutation } = await import('@/lib/services/admin-data-sync.service');
      await notifyAdminModuleMutation('flyer-regles', {
        userId: auth.userId,
        userName: auth.userName,
        details: { action: 'patch' },
      });
    } catch {
      /* best-effort */
    }
    return NextResponse.json({ ok: true, data: { params } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Erreur'), code: 'ERROR' } },
      { status: 500 },
    );
  }
}
