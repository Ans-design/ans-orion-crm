export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission, requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import {
  listCarterieImpositionRules,
  patchCarteriePricingParams,
  importCarterieFromExcel,
  carterieExportExcelPayload,
  ensureCarteriePricingRuntimeReady,
  CARTERIE_IMPOSITION_EXCEL_COLUMNS,
  CARTERIE_REGLES_EXCEL_COLUMNS,
} from '@/lib/services/carterie-pricing-sync.service';
import { getCarterieRuntimeParams } from '@/lib/pricing/carterie-pricing-rules';

export async function GET(req: NextRequest) {
  const auth = await requireAnyPermission('config:view', 'tarifs:read');
  if ('error' in auth) return auth.error;
  try {
    await ensureCarteriePricingRuntimeReady();
    const action = new URL(req.url).searchParams.get('action');
    const imposition = await listCarterieImpositionRules();
    const params = getCarterieRuntimeParams();
    if (action === 'export') {
      return NextResponse.json({
        ok: true,
        data: carterieExportExcelPayload(),
      });
    }
    return NextResponse.json({
      ok: true,
      data: {
        imposition,
        params,
        columns: {
          imposition: CARTERIE_IMPOSITION_EXCEL_COLUMNS,
          rules: CARTERIE_REGLES_EXCEL_COLUMNS,
        },
      },
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
    if (body.action === 'import') {
      const report = await importCarterieFromExcel(
        {
          impositionRows: Array.isArray(body.impositionRows)
            ? (body.impositionRows as Record<string, unknown>[])
            : Array.isArray(body.rows)
              ? (body.rows as Record<string, unknown>[])
              : [],
          rulesRows: Array.isArray(body.rulesRows)
            ? (body.rulesRows as Record<string, unknown>[])
            : [],
        },
        { userId: auth.userId },
      );
      return NextResponse.json({ ok: true, data: report });
    }
    if (body.action === 'sync') {
      const { forceSyncCarteriePricingRuntime } = await import(
        '@/lib/services/carterie-pricing-sync.service'
      );
      const params = await forceSyncCarteriePricingRuntime();
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
    for (const k of [
      'pelliculageA4',
      'gaufrageA4',
      'dorureA4',
      'vernisA4',
      'coinsParFeuille',
      'prixDecoupeParPiece',
    ] as const) {
      if (body[k] != null) patch[k] = Number(body[k]);
    }
    for (const k of [
      'utiliseImpressionSf',
      'utiliseFinitions',
      'utiliseDecoupe',
      'utilisePalier',
      'visiblePos',
      'actif',
    ] as const) {
      if (body[k] !== undefined) patch[k] = body[k] === true;
    }
    if (body.sourcePrixBase != null) patch.sourcePrixBase = String(body.sourcePrixBase);
    if (body.commentaire != null) patch.commentaire = String(body.commentaire);
    if (body.impositionOverrides && typeof body.impositionOverrides === 'object') {
      patch.impositionOverrides = body.impositionOverrides;
    }
    if (body.formatFini && body.piecesParFeuille != null) {
      const { normalizeCarterieImpositionOverride } = await import(
        '@/lib/pricing/carterie-pricing-rules'
      );
      const cur = getCarterieRuntimeParams();
      const key = String(body.formatFini);
      const prev = normalizeCarterieImpositionOverride(cur.impositionOverrides[key]);
      patch.impositionOverrides = {
        ...cur.impositionOverrides,
        [key]: { ...prev, pieces: Math.floor(Number(body.piecesParFeuille)) },
      };
    }
    const params = await patchCarteriePricingParams(
      patch as Partial<import('@/lib/pricing/carterie-pricing-rules').CarteriePricingRuntimeParams>,
      { userId: auth.userId },
    );
    try {
      const { notifyAdminModuleMutation } = await import('@/lib/services/admin-data-sync.service');
      await notifyAdminModuleMutation('carterie-regles', {
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
