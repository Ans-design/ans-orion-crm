'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { mapOverviewToNavBadges } from '@/lib/administration/map-overview-to-nav-badges';
import type { AdminNavBadgeCounts } from '@/lib/administration/admin-macro-modules';
import { unwrapApiData } from '@/lib/api-client';
import type { AdminBackofficeOverview } from '@/lib/server/modules/backoffice-v2/admin-backoffice.types';

const REFRESH_MS = 300_000;
const VISIBILITY_MIN_MS = 120_000;

export function useAdminMacroBadgeCounts(enabled = true) {
  const [counts, setCounts] = useState<AdminNavBadgeCounts>({});
  const lastRefreshAt = useRef(0);

  const refresh = useCallback(async (force = false) => {
    if (!enabled) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    const now = Date.now();
    if (!force && lastRefreshAt.current > 0 && now - lastRefreshAt.current < 15_000) return;

    try {
      const r = await fetch('/api/admin-backoffice/overview', { credentials: 'include', cache: 'no-store' });
      if (r.status === 401) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[useAdminMacroBadgeCounts] 401 ignoré — session conservée');
        }
        return;
      }
      if (!r.ok) return;
      const body = await r.json();
      const overview = unwrapApiData<AdminBackofficeOverview>(body) ?? (body as AdminBackofficeOverview);
      if (overview) {
        lastRefreshAt.current = Date.now();
        setCounts(mapOverviewToNavBadges(overview));
      }
    } catch { /* ignore */ }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const boot = window.setTimeout(() => { void refresh(true); }, 3200);
    const id = setInterval(() => { void refresh(); }, REFRESH_MS);
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      if (lastRefreshAt.current > 0 && Date.now() - lastRefreshAt.current < VISIBILITY_MIN_MS) return;
      void refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearTimeout(boot);
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, refresh]);

  return counts;
}
