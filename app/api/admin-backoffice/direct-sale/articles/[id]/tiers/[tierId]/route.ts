export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import {
  updateDirectSaleTier,
  archiveDirectSaleTier,
} from '@/lib/server/modules/direct-sale/direct-sale.service';

type RouteParams = { params: Promise<{ id: string; tierId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;

  try {
    const { tierId } = await params;
    const body = (await req.json()) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};

    if (body.minQty != null) patch.minQty = Number(body.minQty);
    if (body.maxQty !== undefined) {
      patch.maxQty = body.maxQty === null || body.maxQty === '' ? null : Number(body.maxQty);
    }
    if (body.discountType != null) patch.discountType = String(body.discountType);
    if (body.discountValue != null) patch.discountValue = Number(body.discountValue);
    if (body.finalUnitPrice !== undefined) {
      patch.finalUnitPrice = body.finalUnitPrice === null || body.finalUnitPrice === ''
        ? null
        : Number(body.finalUnitPrice);
    }
    if (body.label !== undefined) patch.label = body.label ? String(body.label) : null;

    const tier = await updateDirectSaleTier(tierId, patch, {
      userId: auth.userId,
      userName: auth.userName,
    });
    return NextResponse.json({ ok: true, data: tier });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Mise à jour impossible'), code: 'UPDATE_ERROR' } },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;

  try {
    const { tierId } = await params;
    await archiveDirectSaleTier(tierId, { userId: auth.userId, userName: auth.userName });
    return NextResponse.json({ ok: true, data: { archived: true } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Suppression impossible'), code: 'DELETE_ERROR' } },
      { status: 500 },
    );
  }
}
