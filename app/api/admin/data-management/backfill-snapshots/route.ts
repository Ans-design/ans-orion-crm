export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { runApiHandler } from '@/lib/api-guard';
import { backfillEntitySnapshots } from '@/lib/server/modules/snapshots/snapshot.service';

/** POST /api/admin/data-management/backfill-snapshots — backfill paymentSnapshot + logisticsSnapshot */
export async function POST(req: NextRequest) {
  const auth = await requirePermission('settings:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('admin backfill-snapshots POST', async () => {
    const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';
    const result = await backfillEntitySnapshots({ dryRun });
    return NextResponse.json({ ok: true, data: result });
  });
}
