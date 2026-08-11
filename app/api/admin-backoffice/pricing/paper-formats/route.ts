export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission, requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import {
  listPaperFormatRules,
  importPaperFormatsFromExcel,
  exportPaperFormatsExcel,
  ensurePricingRulesSeeded,
  syncAllPricingRules,
  verifyPricingConsistency,
} from '@/lib/services/pricing-rules-sync.service';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const auth = await requireAnyPermission('config:view', 'tarifs:read');
  if ('error' in auth) return auth.error;

  const action = new URL(req.url).searchParams.get('action');
  try {
    if (action === 'export') {
      const rows = await exportPaperFormatsExcel();
      return NextResponse.json({ ok: true, data: { rows } });
    }
    if (action === 'verify') {
      const result = await verifyPricingConsistency();
      return NextResponse.json({ ok: true, data: result });
    }
    if (action === 'sync') {
      const result = await syncAllPricingRules();
      return NextResponse.json({ ok: true, data: result });
    }
    const rows = await listPaperFormatRules();
    return NextResponse.json({ ok: true, data: { rows } });
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
    if (body.action === 'seed') {
      await ensurePricingRulesSeeded();
      return NextResponse.json({ ok: true, data: { seeded: true } });
    }
    if (body.action === 'sync') {
      const result = await syncAllPricingRules();
      return NextResponse.json({ ok: true, data: result });
    }
    if (body.action === 'verify') {
      const result = await verifyPricingConsistency();
      return NextResponse.json({ ok: true, data: result });
    }
    if (body.action === 'import' && Array.isArray(body.rows)) {
      const report = await importPaperFormatsFromExcel(body.rows as Record<string, unknown>[]);
      return NextResponse.json({ ok: true, data: report });
    }
    // create / update single
    if (body.formatCode) {
      const data = {
        formatCode: String(body.formatCode).toUpperCase(),
        widthMm: Number(body.widthMm) || 210,
        heightMm: Number(body.heightMm) || 297,
        ratioA4: Number(body.ratioA4) || 1,
        supplementAr: Number(body.supplementAr) || 0,
        cutAr: Number(body.cutAr) || 0,
        formula: body.formula ? String(body.formula) : null,
        active: body.active !== false,
        details: body.details ? String(body.details) : null,
      };
      if (body.id) {
        const row = await prisma.paperFormatRule.update({ where: { id: String(body.id) }, data });
        await syncAllPricingRules();
        return NextResponse.json({ ok: true, data: row });
      }
      const row = await prisma.paperFormatRule.create({ data });
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
    for (const key of ['widthMm', 'heightMm', 'ratioA4', 'supplementAr', 'cutAr'] as const) {
      if (body[key] != null) patch[key] = Number(body[key]);
    }
    if (body.formula !== undefined) patch.formula = body.formula ? String(body.formula) : null;
    if (body.active !== undefined) patch.active = body.active === true;
    if (body.details !== undefined) patch.details = body.details ? String(body.details) : null;
    const row = await prisma.paperFormatRule.update({ where: { id }, data: patch });
    await syncAllPricingRules();
    return NextResponse.json({ ok: true, data: row });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Erreur'), code: 'ERROR' } },
      { status: 500 },
    );
  }
}
