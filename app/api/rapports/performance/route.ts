export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAnyPermission } from '@/lib/auth-utils';
import { stripNamedTeamPerformance } from '@/lib/auth/margin-access';
import { getPerformanceAnalytics } from '@/lib/services/performance-analytics-service';
import { runApiHandler } from '@/lib/api-guard';

/**
 * PF-01 : production peut lire le scope machines (production:read) ;
 * scores nominatifs réservés à rh:read (stripNamedTeamPerformance).
 */
export async function GET() {
  const auth = await requireAnyPermission('rapports:read', 'production:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('rapports/performance GET', async () => {
    const payload = await getPerformanceAnalytics();
    return NextResponse.json(stripNamedTeamPerformance(payload, auth.role));
  }, { fallbackResponse: { summary: {}, series: [] } });
}
