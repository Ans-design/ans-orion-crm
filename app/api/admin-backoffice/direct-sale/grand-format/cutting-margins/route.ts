export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import {
  listGfCuttingMargins,
  loadGfCuttingMarginsToRuntime,
  upsertGfCuttingMargin,
} from '@/lib/services/gf-cutting-margins.service';

export async function GET() {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;
  try {
    const rows = await listGfCuttingMargins();
    await loadGfCuttingMarginsToRuntime();
    return NextResponse.json({ ok: true, data: rows });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Marges découpe indisponibles') } },
      { status: 503 },
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('config:edit_price');
  if ('error' in auth) return auth.error;
  try {
    const body = await req.json();
    const row = await upsertGfCuttingMargin({
      formatCode: String(body.formatCode ?? ''),
      surfaceRatio: Number(body.surfaceRatio),
      marginPercent: Number(body.marginPercent),
      motif: body.motif,
      active: body.active,
      comment: body.comment,
      userId: auth.userId,
    });
    return NextResponse.json({ ok: true, data: row });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Enregistrement impossible') } },
      { status: 400 },
    );
  }
}
