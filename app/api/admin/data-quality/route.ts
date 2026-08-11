export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { runApiHandler } from '@/lib/api-guard';
import {
  getDataQualityTrend,
  persistDataQualityScan,
  runDataQualityScan,
} from '@/lib/server/modules/data-quality/data-quality.service';
import { DATA_QUALITY_RULES } from '@/lib/server/modules/data-quality/data-quality.rules';

/** GET /api/admin/data-quality — scan anomalies données (lecture seule) */
export async function GET(req: NextRequest) {
  const auth = await requirePermission('settings:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('admin data-quality GET', async () => {
    const report = await runDataQualityScan();
    const persist = req.nextUrl.searchParams.get('persist') !== '0';
    if (persist) {
      await persistDataQualityScan(report, { userId: auth.userId, userName: auth.userName });
    }
    const trend = await getDataQualityTrend(14);
    return NextResponse.json({
      ok: true,
      data: { ...report, rules: DATA_QUALITY_RULES, trend },
    });
  });
}
