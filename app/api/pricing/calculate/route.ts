export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { calculatePrice } from '@/lib/pricing/calculate';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { pricingCalculateSchema } from '@/lib/server/modules/pricing/pricing-api.validation';

/** Alias spec — POST /api/pricing/calculate */
export async function POST(req: NextRequest) {
  const auth = await requirePermission('pos:use');
  if ('error' in auth) return auth.error;

  return runApiHandler('pricing/calculate POST', async (): Promise<Response> => {
    try {
      const parsed = parseBody(pricingCalculateSchema, await req.json());
      if (!parsed.ok) return apiError(parsed.error, 400);

      const { articleId, config, options } = parsed.data;
      const result = await calculatePrice(articleId, config, options);
      if (!result) return apiError('Calcul impossible', 404);
      return NextResponse.json({ ok: true, result });
    } catch (error) {
      return apiError(safeErrorMessage(error, 'Erreur calcul'), 500);
    }
  });
}
