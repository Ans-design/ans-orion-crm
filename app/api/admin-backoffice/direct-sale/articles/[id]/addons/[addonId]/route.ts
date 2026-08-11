export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import {
  updateDirectSaleAddon,
  archiveDirectSaleAddon,
} from '@/lib/server/modules/direct-sale/direct-sale.service';

type RouteParams = { params: Promise<{ id: string; addonId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;

  try {
    const { addonId } = await params;
    const body = (await req.json()) as Record<string, unknown>;
    const data: Partial<{ name: string; price: number; unit: string; required: boolean; visiblePOS: boolean; active: boolean }> = {};
    if (body.name !== undefined) data.name = String(body.name);
    if (body.price !== undefined) data.price = Number(body.price);
    if (body.unit !== undefined) data.unit = String(body.unit);
    if (body.required !== undefined) data.required = Boolean(body.required);
    if (body.visiblePOS !== undefined) data.visiblePOS = Boolean(body.visiblePOS);
    if (body.active !== undefined) data.active = Boolean(body.active);

    const addon = await updateDirectSaleAddon(addonId, data, {
      userId: auth.userId,
      userName: auth.userName,
    });
    return NextResponse.json({ ok: true, data: addon });
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
    const { addonId } = await params;
    const addon = await archiveDirectSaleAddon(addonId, {
      userId: auth.userId,
      userName: auth.userName,
    });
    return NextResponse.json({ ok: true, data: addon });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Archivage impossible'), code: 'DELETE_ERROR' } },
      { status: 500 },
    );
  }
}
