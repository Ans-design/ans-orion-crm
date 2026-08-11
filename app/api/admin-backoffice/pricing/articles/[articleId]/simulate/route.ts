export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { runApiHandler } from '@/lib/api-guard';
import { simulateBackofficePricing } from '@/lib/server/modules/pricing/pricing-simulator.service';

type RouteParams = { params: Promise<{ articleId: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission('tarifs:read');
  if ('error' in auth) return auth.error;

  const { articleId } = await params;
  return runApiHandler(`admin-backoffice/pricing/articles/${articleId}/simulate POST`, async () => {
    const body = await req.json().catch(() => ({}));
    const result = await simulateBackofficePricing({
      articleId,
      config: body.config ?? {},
      qty: body.qty,
      prixForce: body.prixForce,
      totalForce: body.totalForce,
      priceReason: body.priceReason,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: { message: result.message, code: result.code } }, { status: 400 });
    }
    return NextResponse.json({ ok: true, data: result });
  }, { fallbackResponse: { ok: false, error: 'Simulation indisponible' } });
}
