export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { countAnomaliesBySeverity, scanPricingAnomalies } from '@/lib/pricing/pricing-anomalies';
import { runApiHandler } from '@/lib/api-guard';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('tarifs:read');
  if ('error' in auth) return auth.error;

  const severity = req.nextUrl.searchParams.get('severity');
  const limit = Math.min(500, Number(req.nextUrl.searchParams.get('limit') ?? 200) || 200);

  return runApiHandler('pricing/anomalies GET', async () => {
    let anomalies = await scanPricingAnomalies(limit);
    if (severity && ['critical', 'warning', 'info'].includes(severity)) {
      anomalies = anomalies.filter((a) => a.severity === severity);
    }
    return NextResponse.json({
      anomalies,
      counts: countAnomaliesBySeverity(anomalies),
    });
  }, { fallback: { anomalies: [], counts: { critical: 0, warning: 0, info: 0 } } });
}
