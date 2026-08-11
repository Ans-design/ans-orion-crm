export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { runApiHandler } from '@/lib/api-guard';
import { safeErrorMessage } from '@/lib/api-response';
import { listBasePrintingPrices } from '@/lib/server/modules/pricing/base-printing-price.service';
import { prisma } from '@/lib/prisma';
import {
  exportBasePrintingExcel,
  importBasePrintingFromExcel,
} from '@/lib/services/pricing-rules-sync.service';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;

  const sp = req.nextUrl.searchParams;
  const action = sp.get('action');

  if (action === 'export') {
    try {
      const rows = await exportBasePrintingExcel();
      return NextResponse.json({ ok: true, data: { rows } });
    } catch (error) {
      return NextResponse.json(
        { ok: false, error: { message: safeErrorMessage(error, 'Export impossible'), code: 'ERROR' } },
        { status: 500 },
      );
    }
  }

  return runApiHandler('admin-backoffice/pricing/base-printing GET', async () => {
    const rows = await listBasePrintingPrices({
      articleId: sp.get('articleId') ?? undefined,
      publishedOnly: sp.get('publishedOnly') === '1',
    });
    return NextResponse.json({ ok: true, data: { rows } });
  }, { fallbackResponse: { ok: false, error: 'Prix base impression indisponibles' } });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;

  try {
    const body = (await req.json()) as Record<string, unknown>;

    if (body.action === 'import' && Array.isArray(body.rows)) {
      const report = await importBasePrintingFromExcel(body.rows as Record<string, unknown>[]);
      return NextResponse.json({ ok: true, data: report });
    }

    const articleId = String(body.articleId ?? '');
    const basePrice = body.basePrice != null ? Number(body.basePrice) : NaN;
    if (!articleId || !Number.isFinite(basePrice)) {
      return NextResponse.json({ ok: false, error: 'articleId et basePrice requis' }, { status: 400 });
    }

    const row = await prisma.basePrintingPrice.create({
      data: {
        articleId,
        materialKey: String(body.materialKey ?? ''),
        grammage: String(body.grammage ?? ''),
        formatLabel: String(body.formatLabel ?? ''),
        face: String(body.face ?? 'recto'),
        saleUnit: String(body.saleUnit ?? 'pcs'),
        referenceQty: Number(body.referenceQty) || 100,
        basePrice,
        maxSafetyPrice: Math.round(basePrice * 1.15),
        active: true,
        publicationStatus: 'draft',
      },
    });

    return NextResponse.json({ ok: true, data: row });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, 'Création impossible') },
      { status: 500 },
    );
  }
}
