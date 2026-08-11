export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { safeErrorMessage } from '@/lib/api-response';
import { ok } from '@/lib/server/http/api-response';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { parseApiDateRange, type ModuleDatePeriod } from '@/lib/date-filter';
import { withTimeout } from '@/lib/with-timeout';
import { emptyDashboardStats } from '@/lib/dashboard-fallback';

const SLICE_TIMEOUT_MS = 20_000;

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

export function createDashboardSliceRoute(
  sliceName: string,
  loader: (period: ModuleDatePeriod, range: { from?: Date; to?: Date }) => Promise<Record<string, unknown>>,
) {
  return withAuthApi(
    `dashboard ${sliceName}`,
    async (_ctx, req: NextRequest) => {
      const searchParams = new URL(req.url).searchParams;
      const period = parsePeriod(searchParams);
      const { from, to } = parseApiDateRange(searchParams);

      try {
        const data = await withTimeout(loader(period, { from, to }), SLICE_TIMEOUT_MS, `dashboard_${sliceName}`);
        return ok(data);
      } catch (error) {
        const fallback = emptyDashboardStats(period);
        return ok(
          { ...fallback, _warning: safeErrorMessage(error, `Erreur chargement ${sliceName}`) },
          { degraded: true, slice: sliceName },
        );
      }
    },
    {
      anyPermissions: ['clients:read', 'commandes:read', 'production:read', 'rapports:read'],
    },
  );
}
