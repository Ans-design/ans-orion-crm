export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { stockCheckSchema } from '@/lib/server/modules/stock/stock.validation';
import { runStockCheck } from '@/lib/server/modules/stock/stock.service';

export async function POST(req: NextRequest) {
  const auth = await requirePermission('pos:use');
  if ('error' in auth) return auth.error;

  return runApiHandler('stock/check POST', async (): Promise<Response> => {
    const parsed = parseBody(stockCheckSchema, await req.json());
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const check = await runStockCheck(parsed.data, auth.role);
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }

    return NextResponse.json(check.result);
  }, { fallback: { available: false, message: 'Vérification stock indisponible' } });
}
