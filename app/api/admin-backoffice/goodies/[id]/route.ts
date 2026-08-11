export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import {
  patchGoodiesRow,
  softDeleteGoodiesRow,
  type GoodiesTableKind,
} from '@/lib/server/modules/goodies/goodies-admin.service';

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;
  try {
    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;
    const kind = (String(body.kind || 'models') as GoodiesTableKind);
    const data = await patchGoodiesRow(kind, id, body, {
      userId: auth.userId,
      userName: auth.userName,
    });
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: { message: e instanceof Error ? e.message : 'MAJ impossible' } },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;
  try {
    const { id } = await params;
    const kind = (req.nextUrl.searchParams.get('kind') || 'models') as GoodiesTableKind;
    const data = await softDeleteGoodiesRow(kind, id, {
      userId: auth.userId,
      userName: auth.userName,
    });
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: { message: e instanceof Error ? e.message : 'Suppression impossible' } },
      { status: 500 },
    );
  }
}
