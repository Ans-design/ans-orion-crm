export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission } from '@/lib/auth-utils';
import { linkMaterialToStock, getMaterialStockSummary } from '@/lib/server/modules/materials/material-stock-sync.service';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAnyPermission('config:view', 'tarifs:read', 'production:read');
  if ('error' in auth) return auth.error;

  const data = await getMaterialStockSummary(params.id);
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAnyPermission('tarifs:write', 'production:write');
  if ('error' in auth) return auth.error;

  const body = (await req.json()) as { stockItemId?: string };
  if (!body.stockItemId) {
    return NextResponse.json({ ok: false, error: 'stockItemId requis' }, { status: 400 });
  }

  const data = await linkMaterialToStock(params.id, body.stockItemId);
  return NextResponse.json({ ok: true, data });
}
