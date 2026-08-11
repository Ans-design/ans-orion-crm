export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission, requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import {
  listSupportFaceRules,
  importSupportFacesFromExcel,
  exportSupportFacesExcel,
  syncAllPricingRules,
} from '@/lib/services/pricing-rules-sync.service';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const auth = await requireAnyPermission('config:view', 'tarifs:read');
  if ('error' in auth) return auth.error;
  const action = new URL(req.url).searchParams.get('action');
  try {
    if (action === 'export') {
      return NextResponse.json({ ok: true, data: { rows: await exportSupportFacesExcel() } });
    }
    return NextResponse.json({ ok: true, data: { rows: await listSupportFaceRules() } });
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
      const report = await importSupportFacesFromExcel(body.rows as Record<string, unknown>[]);
      return NextResponse.json({ ok: true, data: report });
    }
    if (body.supportLabel) {
      const supportKey = String(body.supportKey || body.supportLabel)
        .toLowerCase()
        .replace(/\s+/g, '_')
        .slice(0, 80);
      const data = {
        supportKey,
        supportLabel: String(body.supportLabel),
        rectoAllowed: body.rectoAllowed !== false,
        versoAllowed: body.versoAllowed === true,
        rectoVersoAllowed: body.rectoVersoAllowed === true,
        reason: body.reason ? String(body.reason) : null,
        active: body.active !== false,
      };
      const row = await prisma.supportFaceRule.create({ data });
      await syncAllPricingRules();
      return NextResponse.json({ ok: true, data: row }, { status: 201 });
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
    for (const k of ['rectoAllowed', 'versoAllowed', 'rectoVersoAllowed', 'active'] as const) {
      if (body[k] !== undefined) patch[k] = body[k] === true;
    }
    if (body.reason !== undefined) patch.reason = body.reason ? String(body.reason) : null;
    const row = await prisma.supportFaceRule.update({ where: { id }, data: patch });
    await syncAllPricingRules();
    return NextResponse.json({ ok: true, data: row });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Erreur'), code: 'ERROR' } },
      { status: 500 },
    );
  }
}
