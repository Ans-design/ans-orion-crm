export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAnyPermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { unlinkStockFromMaterial } from '@/lib/server/modules/stock/stock-material-link.service';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAnyPermission('stock:write', 'production:write');
  if ('error' in auth) return auth.error;

  try {
    const data = await unlinkStockFromMaterial(params.id);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: safeErrorMessage(error, 'Déliaison impossible') }, { status: 500 });
  }
}
