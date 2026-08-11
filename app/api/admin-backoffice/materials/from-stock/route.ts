export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { createMaterialFromStock } from '@/lib/server/modules/materials/materials-completeness.service';

export async function POST(req: NextRequest) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;

  try {
    const body = (await req.json()) as { stockItemId?: string };
    if (!body.stockItemId) {
      return NextResponse.json({ ok: false, error: 'stockItemId requis' }, { status: 400 });
    }
    const row = await createMaterialFromStock(body.stockItemId);
    return NextResponse.json({ ok: true, data: row });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, 'Import stock impossible') },
      { status: 500 },
    );
  }
}
