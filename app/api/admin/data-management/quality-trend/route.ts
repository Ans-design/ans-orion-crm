export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { runApiHandler } from '@/lib/api-guard';
import { getDataQualityTrend } from '@/lib/server/modules/data-quality/data-quality.service';

function toCsv(rows: { scannedAt: string; totalAnomalies: number; critical: number; high: number }[]) {
  const header = 'scannedAt,totalAnomalies,critical,high';
  const lines = rows.map(
    (r) => `${r.scannedAt},${r.totalAnomalies},${r.critical},${r.high}`,
  );
  return [header, ...lines].join('\n');
}

/** GET /api/admin/data-management/quality-trend — export CSV tendance scans */
export async function GET() {
  const auth = await requirePermission('settings:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('admin quality-trend export GET', async () => {
    const trend = await getDataQualityTrend(50);
    const csv = toCsv(trend);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="orion-quality-trend-${Date.now()}.csv"`,
      },
    });
  });
}
