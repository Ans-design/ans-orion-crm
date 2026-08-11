export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { linkStockToMaterial } from '@/lib/server/modules/stock/stock-material-link.service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAnyPermission('stock:write', 'production:write');
  if ('error' in auth) return auth.error;

  try {
    const body = (await req.json().catch(() => ({}))) as { materialId?: string };
    const data = await linkStockToMaterial(params.id, body.materialId);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: safeErrorMessage(error, 'Liaison impossible') }, { status: 500 });
  }
}
