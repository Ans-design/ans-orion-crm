export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { apiError } from '@/lib/api-response';
import { resolvePrice } from '@/lib/pricing/ans-price-store';
import { runApiHandler } from '@/lib/api-guard';
import { parseBody } from '@/lib/validators/common';
import { pricingResolveSchema } from '@/lib/server/modules/pricing/pricing-api.validation';

export async function POST(req: NextRequest) {
  const auth = await requirePermission('pos:use');
  if ('error' in auth) return auth.error;

  return runApiHandler('price-store/resolve POST', async (): Promise<Response> => {
    const parsed = parseBody(pricingResolveSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);
    const { articleId, config, prixForce, totalForce, priceReason } = parsed.data;

    const result = await resolvePrice(
      articleId,
      config,
      { prixForce, totalForce, priceReason },
    );

    if (!result) return apiError('Article introuvable', 404);
    return NextResponse.json(result);
  }, {
    fallbackResponse: { error: 'Moteur prix indisponible' },
  });
}
