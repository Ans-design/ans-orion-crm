export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { runApiHandler } from '@/lib/api-guard';
import { getPricingGlobalVariables } from '@/lib/server/modules/backoffice-v2/admin-backoffice-pricing.service';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;

  const sp = req.nextUrl.searchParams;
  const impact = sp.get('impact');
  return runApiHandler('admin-backoffice/pricing/variables GET', async () => {
    const rows = await getPricingGlobalVariables({
      impact: impact === 'price' || impact === 'indicative' ? impact : 'all',
      limit: Number(sp.get('limit') ?? 500),
    });
    return NextResponse.json({ ok: true, data: { rows } });
  }, { fallbackResponse: { ok: false, error: 'Variables indisponibles' } });
}
