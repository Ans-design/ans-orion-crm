export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { runApiHandler } from '@/lib/api-guard';
import { listTierArticles } from '@/lib/server/modules/backoffice-v2/admin-backoffice-tiers.service';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;

  const sp = req.nextUrl.searchParams;
  return runApiHandler('admin-backoffice/tiers/articles GET', async () => {
    const data = await listTierArticles({
      search: sp.get('search') ?? undefined,
      category: sp.get('category') ?? undefined,
      includeInactive: sp.get('includeInactive') === '1',
      onlyWithTiers: sp.get('onlyWithTiers') === '1',
      onlyWithoutTiers: sp.get('onlyWithoutTiers') === '1',
      onlyWithAnomalies: sp.get('onlyWithAnomalies') === '1',
    });
    return NextResponse.json({ ok: true, data });
  }, { fallbackResponse: { ok: false, error: 'Articles paliers indisponibles' } });
}
