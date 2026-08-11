export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission, requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import {
  listDirectSaleAddons,
  createDirectSaleAddon,
} from '@/lib/server/modules/direct-sale/direct-sale.service';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const auth = await requireAnyPermission('config:view', 'tarifs:read');
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const rows = await listDirectSaleAddons(id);
  return NextResponse.json({ ok: true, data: { rows } });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;
    const name = String(body.name ?? '').trim();
    if (!name) {
      return NextResponse.json(
        { ok: false, error: { message: 'Nom supplément requis', code: 'VALIDATION' } },
        { status: 400 },
      );
    }
    const addon = await createDirectSaleAddon(
      id,
      {
        name,
        price: Number(body.price) || 0,
        unit: body.unit ? String(body.unit) : 'pièce',
        required: body.required === true,
        visiblePOS: body.visiblePOS !== false,
      },
      { userId: auth.userId, userName: auth.userName },
    );
    return NextResponse.json({ ok: true, data: addon }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Création impossible'), code: 'CREATE_ERROR' } },
      { status: 500 },
    );
  }
}
