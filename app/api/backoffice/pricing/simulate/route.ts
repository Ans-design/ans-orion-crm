export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { pricingSimulateSchema } from '@/lib/server/modules/pricing/pricing-api.validation';
import { simulateBackofficePricing } from '@/lib/server/modules/pricing/pricing-simulator.service';

export async function POST(req: NextRequest) {
  const auth = await requirePermission('tarifs:read');
  if ('error' in auth) return auth.error;

  try {
    const parsed = parseBody(pricingSimulateSchema, await req.json());
    if (!parsed.ok) {
      return NextResponse.json(
        { ok: false, error: { message: parsed.error, code: 'VALIDATION' } },
        { status: 400 },
      );
    }

    const result = await simulateBackofficePricing(parsed.data);
    if (!result.ok) {
      const status = result.code === 'NOT_FOUND' ? 404 : 400;
      return NextResponse.json(
        { ok: false, error: { message: result.message, code: result.code } },
        { status },
      );
    }

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    console.error('[backoffice/pricing/simulate]', error);
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Simulation impossible'), code: 'SIMULATE_ERROR' } },
      { status: 503 },
    );
  }
}
