export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { runApiHandler } from '@/lib/api-guard';
import { getGlobalTiers } from '@/lib/server/modules/backoffice-v2/admin-backoffice-tiers.service';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;

  const sp = req.nextUrl.searchParams;
  return runApiHandler('admin-backoffice/tiers/global GET', async () => {
    const data = await getGlobalTiers({
      search: sp.get('search') ?? undefined,
      limit: sp.get('limit') ? Number(sp.get('limit')) : undefined,
    });
    return NextResponse.json({ ok: true, data });
  }, { fallbackResponse: { ok: false, error: 'Vue globale indisponible' } });
}
