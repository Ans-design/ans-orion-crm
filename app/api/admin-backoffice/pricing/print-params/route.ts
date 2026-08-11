export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission, requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import {
  listPrintTechnologyRules,
  listServiceEquivalences,
  importPrintTechFromExcel,
  importServiceEquivFromExcel,
  exportPrintTechExcel,
  exportServiceEquivExcel,
  syncAllPricingRules,
  ensurePricingRulesSeeded,
} from '@/lib/services/pricing-rules-sync.service';
import { prisma } from '@/lib/prisma';

type Kind = 'tech' | 'services';

function kindFromUrl(req: NextRequest): Kind {
  const k = new URL(req.url).searchParams.get('kind') || 'tech';
  return k === 'services' ? 'services' : 'tech';
}

export async function GET(req: NextRequest) {
  const auth = await requireAnyPermission('config:view', 'tarifs:read');
  if ('error' in auth) return auth.error;
  await ensurePricingRulesSeeded();
  const kind = kindFromUrl(req);
  const action = new URL(req.url).searchParams.get('action');
  try {
    if (action === 'export') {
      const rows = kind === 'services' ? await exportServiceEquivExcel() : await exportPrintTechExcel();
      return NextResponse.json({ ok: true, data: { rows } });
    }
    if (kind === 'services') {
      return NextResponse.json({ ok: true, data: { rows: await listServiceEquivalences() } });
    }
    return NextResponse.json({ ok: true, data: { rows: await listPrintTechnologyRules() } });
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
  const kind = kindFromUrl(req);
  try {
    const body = (await req.json()) as Record<string, unknown>;
    if (body.action === 'import' && Array.isArray(body.rows)) {
      const report =
        kind === 'services'
          ? await importServiceEquivFromExcel(body.rows as Record<string, unknown>[])
          : await importPrintTechFromExcel(body.rows as Record<string, unknown>[]);
      return NextResponse.json({ ok: true, data: report });
    }
    if (body.action === 'sync') {
      const result = await syncAllPricingRules();
      return NextResponse.json({ ok: true, data: result });
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
  const kind = kindFromUrl(req);
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const id = String(body.id ?? '');
    if (!id) {
      return NextResponse.json({ ok: false, error: { message: 'id requis', code: 'VALIDATION' } }, { status: 400 });
    }
    if (kind === 'services') {
      const row = await prisma.servicePriceEquivalence.update({
        where: { id },
        data: {
          ...(body.active !== undefined ? { active: body.active === true } : {}),
          ...(body.details !== undefined ? { details: body.details ? String(body.details) : null } : {}),
        },
      });
      await syncAllPricingRules();
      return NextResponse.json({ ok: true, data: row });
    }
    const row = await prisma.printTechnologyRule.update({
      where: { id },
      data: {
        ...(body.supplementAr != null ? { supplementAr: Number(body.supplementAr) } : {}),
        ...(body.active !== undefined ? { active: body.active === true } : {}),
        ...(body.details !== undefined ? { details: body.details ? String(body.details) : null } : {}),
      },
    });
    await syncAllPricingRules();
    return NextResponse.json({ ok: true, data: row });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Erreur'), code: 'ERROR' } },
      { status: 500 },
    );
  }
}
