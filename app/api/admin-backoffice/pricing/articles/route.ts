export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { runApiHandler } from '@/lib/api-guard';
import { listPricingArticles } from '@/lib/server/modules/backoffice-v2/admin-backoffice-pricing.service';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;

  const sp = req.nextUrl.searchParams;
  return runApiHandler('admin-backoffice/pricing/articles GET', async () => {
    const data = await listPricingArticles({
      search: sp.get('search') ?? undefined,
      category: sp.get('category') ?? undefined,
      family: sp.get('family') ?? undefined,
      calculationType: sp.get('calculationType') ?? undefined,
      formulaStatus: sp.get('formulaStatus') ?? undefined,
      includeInactive: sp.get('includeInactive') === '1',
      onlyWithAnomalies: sp.get('onlyWithAnomalies') === '1',
      onlyWithoutFormula: sp.get('onlyWithoutFormula') === '1',
    });
    return NextResponse.json({ ok: true, data });
  }, { fallbackResponse: { ok: false, error: 'Articles prix indisponibles' } });
}
