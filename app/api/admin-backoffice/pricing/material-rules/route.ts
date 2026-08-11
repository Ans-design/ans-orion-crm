export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission, requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import {
  listMaterialEquivalences,
  listThickPaperRules,
  listBlankMaterialPrices,
  importMaterialEquivalencesFromExcel,
  importThickPaperFromExcel,
  importBlankMaterialsFromExcel,
  ensurePricingRulesSeeded,
} from '@/lib/services/pricing-rules-sync.service';
import { prisma } from '@/lib/prisma';
import {
  MATERIAL_EQUIV_EXCEL_COLUMNS,
  THICK_PAPER_EXCEL_COLUMNS,
  BLANK_MATERIAL_EXCEL_COLUMNS,
} from '@/lib/backoffice/pricing-rules-excel-format';
import { canViewMargin, stripPurchasePriceFieldsDeep } from '@/lib/auth/margin-access';

type Kind = 'equivalences' | 'thick-paper' | 'blank-materials';

function kindFromUrl(req: NextRequest): Kind {
  const k = new URL(req.url).searchParams.get('kind') || 'equivalences';
  if (k === 'thick-paper' || k === 'blank-materials') return k;
  return 'equivalences';
}

function blankMaterialColumnsForRole(role: string): string[] {
  if (canViewMargin(role)) return [...BLANK_MATERIAL_EXCEL_COLUMNS];
  return BLANK_MATERIAL_EXCEL_COLUMNS.filter(
    (c) => c !== 'PRIX ACHAT' && c !== 'UNITÉ ACHAT' && !/achat/i.test(c),
  );
}

export async function GET(req: NextRequest) {
  const auth = await requireAnyPermission('config:view', 'tarifs:read');
  if ('error' in auth) return auth.error;
  await ensurePricingRulesSeeded();
  const kind = kindFromUrl(req);
  const role = auth.role ?? 'user';
  try {
    if (kind === 'thick-paper') {
      return NextResponse.json({
        ok: true,
        data: { rows: await listThickPaperRules(), columns: THICK_PAPER_EXCEL_COLUMNS },
      });
    }
    if (kind === 'blank-materials') {
      const rows = stripPurchasePriceFieldsDeep(await listBlankMaterialPrices(), role);
      return NextResponse.json({
        ok: true,
        data: { rows, columns: blankMaterialColumnsForRole(role) },
      });
    }
    return NextResponse.json({
      ok: true,
      data: { rows: await listMaterialEquivalences(), columns: MATERIAL_EQUIV_EXCEL_COLUMNS },
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
  const kind = kindFromUrl(req);
  try {
    const body = (await req.json()) as Record<string, unknown>;
    if (body.action === 'import' && Array.isArray(body.rows)) {
      const rows = body.rows as Record<string, unknown>[];
      const report =
        kind === 'thick-paper'
          ? await importThickPaperFromExcel(rows)
          : kind === 'blank-materials'
            ? await importBlankMaterialsFromExcel(rows)
            : await importMaterialEquivalencesFromExcel(rows);
      return NextResponse.json({ ok: true, data: report });
    }
    if (kind === 'blank-materials' && body.name) {
      const row = await prisma.blankMaterialPrice.create({
        data: {
          name: String(body.name),
          grammage: body.grammage ? String(body.grammage) : null,
          purchasePrice: Number(body.purchasePrice) || 0,
          purchaseUnit: String(body.purchaseUnit ?? 'feuille'),
          active: body.active !== false,
        },
      });
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
  const kind = kindFromUrl(req);
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const id = String(body.id ?? '');
    if (!id) {
      return NextResponse.json({ ok: false, error: { message: 'id requis', code: 'VALIDATION' } }, { status: 400 });
    }
    if (kind === 'blank-materials') {
      const row = await prisma.blankMaterialPrice.update({
        where: { id },
        data: {
          ...(body.purchasePrice != null ? { purchasePrice: Number(body.purchasePrice) } : {}),
          ...(body.active !== undefined ? { active: body.active === true } : {}),
          ...(body.name ? { name: String(body.name) } : {}),
        },
      });
      return NextResponse.json({ ok: true, data: row });
    }
    if (kind === 'thick-paper') {
      const row = await prisma.thickPaperRule.update({
        where: { id },
        data: {
          ...(body.supplementAr != null ? { supplementAr: Number(body.supplementAr) } : {}),
          ...(body.active !== undefined ? { active: body.active === true } : {}),
        },
      });
      return NextResponse.json({ ok: true, data: row });
    }
    const row = await prisma.materialPriceEquivalence.update({
      where: { id },
      data: {
        ...(body.supplementAr != null ? { supplementAr: Number(body.supplementAr) } : {}),
        ...(body.active !== undefined ? { active: body.active === true } : {}),
      },
    });
    return NextResponse.json({ ok: true, data: row });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Erreur'), code: 'ERROR' } },
      { status: 500 },
    );
  }
}
