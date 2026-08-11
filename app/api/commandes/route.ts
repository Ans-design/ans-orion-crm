export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { runApiHandler } from '@/lib/api-guard';
import {
  getCommandesSummary,
  listCommandes,
  parseCommandeListQuery,
} from '@/lib/server/modules/commandes/commandes.service';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('commandes:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('commandes GET', async () => {
    const query = parseCommandeListQuery(new URL(req.url).searchParams);

    if (query.summary) {
      return NextResponse.json(await getCommandesSummary({ from: query.from, to: query.to }));
    }

    const result = await listCommandes(query);
    return NextResponse.json(result);
  }, { fallback: { commandes: [], total: 0 } });
}
