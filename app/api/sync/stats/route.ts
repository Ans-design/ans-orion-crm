export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { getOrionSyncStats } from '@/lib/sync/orion-sync';
import { runApiHandler } from '@/lib/api-guard';

/** Stats synchronisées Orion — dashboard, workspaces, alertes */
export async function GET(req: NextRequest) {
  const auth = await requirePermission('commandes:read');
  if ('error' in auth) return auth.error;

  const role = req.nextUrl.searchParams.get('role') || auth.role;

  return runApiHandler('sync/stats GET', async () => {
    return NextResponse.json(await getOrionSyncStats(role));
  }, { fallbackResponse: { modules: [], alerts: [] } });
}
