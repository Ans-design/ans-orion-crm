export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import {
  patchTextileRow,
  softDeleteTextileRow,
  type TextileTableKind,
} from '@/lib/server/modules/textile/textile-admin.service';

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;
  try {
    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;
    const kind = String(body.kind || 'supports') as TextileTableKind;
    const data = await patchTextileRow(kind, id, body, {
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
    const kind = (req.nextUrl.searchParams.get('kind') || 'supports') as TextileTableKind;
    const data = await softDeleteTextileRow(kind, id, {
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
