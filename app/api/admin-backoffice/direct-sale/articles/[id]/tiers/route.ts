export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission, requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import {
  listDirectSaleTiersForArticle,
  createDirectSaleTier,
} from '@/lib/server/modules/direct-sale/direct-sale.service';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const auth = await requireAnyPermission('config:view', 'tarifs:read');
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const rows = await listDirectSaleTiersForArticle(id);
  return NextResponse.json({ ok: true, data: { rows } });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;
    const minQty = Number(body.minQty);
    if (!Number.isFinite(minQty) || minQty < 1) {
      return NextResponse.json(
        { ok: false, error: { message: 'Quantité minimum invalide', code: 'VALIDATION' } },
        { status: 400 },
      );
    }

    const tier = await createDirectSaleTier(
      id,
      {
        minQty,
        maxQty: body.maxQty != null && body.maxQty !== '' ? Number(body.maxQty) : null,
        discountType: body.discountType ? String(body.discountType) : 'unit_price',
        discountValue: Number(body.discountValue) || 0,
        finalUnitPrice: body.finalUnitPrice != null && body.finalUnitPrice !== ''
          ? Number(body.finalUnitPrice)
          : null,
        label: body.label ? String(body.label) : null,
      },
      { userId: auth.userId, userName: auth.userName },
    );

    return NextResponse.json({ ok: true, data: tier }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Création palier impossible'), code: 'CREATE_ERROR' } },
      { status: 500 },
    );
  }
}
