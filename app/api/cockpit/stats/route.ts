export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission } from '@/lib/auth-utils';
import { getRoleCockpitStats, getOperationsStats } from '@/lib/cockpit/cockpit-stats';
import { withTimeout } from '@/lib/with-timeout';
import { runApiHandler } from '@/lib/api-guard';
import {
  stripDashboardMarginFields,
  stripOperationsFinancial,
} from '@/lib/auth/margin-access';

const COCKPIT_TIMEOUT_MS = 10_000;

export async function GET(req: NextRequest) {
  const auth = await requireAnyPermission('commandes:read', 'production:read', 'rapports:read');
  if ('error' in auth) return auth.error;

  const { searchParams } = req.nextUrl;
  const mode = searchParams.get('mode');
  const period = (searchParams.get('period') || 'week') as 'day' | 'week' | 'month';
  // CK-05 : ignorer ?role= client — toujours session authentifiée
  void searchParams.get('role');
  /** Profil workspace demandé (ex. magasin) — n’élargit jamais les droits ; intersect session. */
  const profile = searchParams.get('profile');
  const cockpitRole =
    profile === 'magasin' && (auth.role === 'magasin' || auth.role === 'magasinier' || auth.role === 'admin' || auth.role === 'manager' || auth.role === 'demo' || auth.role === 'production')
      ? 'magasin'
      : auth.role;

  return runApiHandler('cockpit/stats GET', async () => {
    if (mode === 'operations') {
      const data = await withTimeout(getOperationsStats(), COCKPIT_TIMEOUT_MS, 'cockpit_ops');
      return NextResponse.json(stripOperationsFinancial(data, auth.role));
    }

    const data = await withTimeout(
      getRoleCockpitStats(cockpitRole, period, { userId: auth.userId }),
      COCKPIT_TIMEOUT_MS,
      'cockpit_stats',
    );
    return NextResponse.json(
      stripDashboardMarginFields(data as unknown as Record<string, unknown>, auth.role),
    );
  }, {
    fallbackResponse: {
      emptyDatabase: true,
      kpis: {},
      alertes: [],
    },
  });
}
