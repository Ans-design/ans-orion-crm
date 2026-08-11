export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { resolveStockAvailability } from '@/lib/services/stock-service';
import { apiError } from '@/lib/api-response';
import { runApiHandler } from '@/lib/api-guard';
import { parseBody } from '@/lib/validators/common';
import { posStockCheckSchema } from '@/lib/server/modules/pricing/pricing-api.validation';

export async function POST(req: NextRequest) {
  const auth = await requirePermission('pos:use');
  if ('error' in auth) return auth.error;

  return runApiHandler('pos/stock-check POST', async (): Promise<Response> => {
    const parsed = parseBody(posStockCheckSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);
    const { articleId, qty, config } = parsed.data;

    const result = await resolveStockAvailability({
      articleId,
      quantity: qty,
      configuration: config,
      userRole: auth.role,
    });

    return NextResponse.json({
      ok: true,
      articleId,
      qty,
      ...result,
      blocking: !result.canAddToCart,
      warnings: result.status !== 'AVAILABLE' ? [result.message] : [],
    });
  }, {
    fallbackResponse: { ok: false, blocking: true, warnings: ['Stock indisponible'] },
  });
}
