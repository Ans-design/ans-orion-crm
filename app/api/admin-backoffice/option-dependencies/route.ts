export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import {
  diagnoseOptionDependencies,
  listOptionDependencies,
  softDeleteOptionDependency,
  upsertOptionDependency,
} from '@/lib/services/option-dependency.service';

export async function GET(req: NextRequest) {
  const auth = await requireAnyPermission('config:view', 'tarifs:read');
  if ('error' in auth) return auth.error;

  const articleId = new URL(req.url).searchParams.get('articleId') || undefined;
  try {
    const [rows, issues] = await Promise.all([
      listOptionDependencies(articleId),
      diagnoseOptionDependencies(articleId),
    ]);
    return NextResponse.json({ ok: true, data: { rows, issues } });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(e, 'Dépendances indisponibles') } },
      { status: 503 },
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAnyPermission('tarifs:write', 'config:edit_chips', 'config:edit_features');
  if ('error' in auth) return auth.error;

  try {
    const body = await req.json();
    const row = await upsertOptionDependency(body, {
      userId: auth.userId,
      userName: auth.userName,
    });
    return NextResponse.json({ ok: true, data: row });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(e, 'Enregistrement impossible') } },
      { status: 400 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAnyPermission('tarifs:write', 'config:edit_chips', 'config:edit_features');
  if ('error' in auth) return auth.error;

  const id = new URL(req.url).searchParams.get('id');
  if (!id) {
    return NextResponse.json(
      { ok: false, error: { message: 'id requis', code: 'BAD_REQUEST' } },
      { status: 400 },
    );
  }
  try {
    await softDeleteOptionDependency(id, {
      userId: auth.userId,
      userName: auth.userName,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(e, 'Suppression impossible') } },
      { status: 400 },
    );
  }
}
