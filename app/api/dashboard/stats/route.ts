export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { safeErrorMessage } from '@/lib/api-response';
import { ok } from '@/lib/server/http/api-response';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { loadDashboardFullStats } from '@/lib/services/dashboard-slices';
import { emptyDashboardStats } from '@/lib/dashboard-fallback';
import { parseApiDateRange, type ModuleDatePeriod } from '@/lib/date-filter';
import { withTimeout } from '@/lib/with-timeout';
import { stripDashboardMarginFields } from '@/lib/auth/margin-access';

const STATS_TIMEOUT_MS = 20_000;

const DASHBOARD_PERMISSIONS = [
  'clients:read',
  'commandes:read',
  'production:read',
  'rapports:read',
] as const;

function parsePeriod(searchParams: URLSearchParams): ModuleDatePeriod {
  const periodParam = searchParams.get('period') as ModuleDatePeriod | null;
  return periodParam === 'day' ||
    periodParam === 'week' ||
    periodParam === 'month' ||
    periodParam === 'year' ||
    periodParam === 'all'
    ? periodParam
    : 'week';
}

export const GET = withAuthApi(
  'dashboard stats',
  async (ctx, req: NextRequest) => {
    const searchParams = new URL(req.url).searchParams;
    const period = parsePeriod(searchParams);
    const { from, to } = parseApiDateRange(searchParams);
    const role = ctx.role;

    try {
      const data = await withTimeout(
        loadDashboardFullStats(period, { from, to }),
        STATS_TIMEOUT_MS,
        'dashboard_stats',
      );
      return ok(
        stripDashboardMarginFields(
          data as unknown as Record<string, unknown>,
          role,
        ),
      );
    } catch (error) {
      console.error('Dashboard stats error:', error);
      const fallback = emptyDashboardStats(period);
      fallback.alertes = [{
        type: 'warning',
        label: 'Chargement partiel — base lente ou vide',
        href: '/administration/vue-ensemble',
      }];
      return ok(
        {
          ...stripDashboardMarginFields(
            fallback as unknown as Record<string, unknown>,
            role,
          ),
          _warning: safeErrorMessage(error, 'Erreur chargement dashboard'),
        },
        { degraded: true },
      );
    }
  },
  { anyPermissions: [...DASHBOARD_PERMISSIONS] },
);
