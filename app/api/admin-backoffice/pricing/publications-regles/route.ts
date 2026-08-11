export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission, requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import {
  ensurePublicationPricingRuntimeReady,
  patchPublicationPricingParams,
  importPublicationRulesFromExcel,
  publicationExportExcelPayload,
  PUBLICATION_REGLES_EXCEL_COLUMNS,
} from '@/lib/services/publication-pricing-sync.service';
import { getPublicationRuntimeParams } from '@/lib/pricing/publication-pricing-rules';

export async function GET(req: NextRequest) {
  const auth = await requireAnyPermission('config:view', 'tarifs:read');
  if ('error' in auth) return auth.error;
  try {
    await ensurePublicationPricingRuntimeReady();
    const action = new URL(req.url).searchParams.get('action');
    if (action === 'export') {
      return NextResponse.json({ ok: true, data: publicationExportExcelPayload() });
    }
    return NextResponse.json({
      ok: true,
      data: {
        params: getPublicationRuntimeParams(),
        columns: PUBLICATION_REGLES_EXCEL_COLUMNS,
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
      const report = await importPublicationRulesFromExcel(
        {
          rulesRows: Array.isArray(body.rulesRows)
            ? (body.rulesRows as Record<string, unknown>[])
            : Array.isArray(body.rows)
              ? (body.rows as Record<string, unknown>[])
              : [],
          paliersRows: Array.isArray(body.paliersRows)
            ? (body.paliersRows as Record<string, unknown>[])
            : [],
        },
        { userId: auth.userId },
      );
      return NextResponse.json({ ok: true, data: report });
    }
    if (body.action === 'sync') {
      const { forceSyncPublicationPricingRuntime } = await import(
        '@/lib/services/publication-pricing-sync.service'
      );
      const params = await forceSyncPublicationPricingRuntime();
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
      'fallbackPuNoirA4',
      'fallbackPuQuadriA4',
      'fallbackCoverPrintAr',
      'coverRigidSupplementAr',
      'pelliculageCouvertureA4',
      'blocColleAr',
      'coinsParExemplaire',
    ] as const) {
      if (body[k] != null) patch[k] = Number(body[k]);
    }
    for (const k of ['utilisePalier', 'allowFallbackPrint', 'visiblePos', 'actif'] as const) {
      if (body[k] !== undefined) patch[k] = body[k] === true;
    }
    if (body.commentaire != null) patch.commentaire = String(body.commentaire);
    if (Array.isArray(body.volumeTiers)) patch.volumeTiers = body.volumeTiers;
    const params = await patchPublicationPricingParams(
      patch as Partial<import('@/lib/pricing/publication-pricing-rules').PublicationPricingRuntimeParams>,
      { userId: auth.userId },
    );
    try {
      const { notifyAdminModuleMutation } = await import('@/lib/services/admin-data-sync.service');
      await notifyAdminModuleMutation('publications-regles', {
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
