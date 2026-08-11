export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission } from '@/lib/auth-utils';
import { parseOr400 } from '@/lib/validators/parse';
import { generateSkuSchema } from '@/lib/server/modules/stock/stock.validation';
import { generateStockSku } from '@/lib/server/modules/stock/stock.service';

export async function POST(req: NextRequest) {
  const auth = await requireAnyPermission('stock:write', 'production:write');
  if ('error' in auth) return auth.error;

  const parsed = parseOr400(generateSkuSchema, await req.json());
  if ('error' in parsed) return parsed.error;

  const sku = await generateStockSku(parsed.data);
  return NextResponse.json({ ok: true, data: { sku } });
}
