'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import { unwrapApiData } from '@/lib/api-client';
import type { ModuleDatePeriod } from '@/lib/date-filter';

export type DashboardStatsPayload = Record<string, unknown> & {
  _warning?: string;
};

type Options = {
  period?: ModuleDatePeriod;
  from?: Date;
  to?: Date;
  timeoutMs?: number;
  enabled?: boolean;
};

/** Hook dashboard — fetch /api/dashboard/stats avec timeout et états UI. */
export function useDashboardStats(options: Options = {}) {
  const {
    period = 'month',
    from,
    to,
    timeoutMs = 12_000,
    enabled = true,
  } = options;

  const [data, setData] = useState<DashboardStatsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams({ period });
      if (from) p.set('from', from.toISOString());
      if (to) p.set('to', to.toISOString());
      const r = await fetchWithTimeout(`/api/dashboard/stats?${p}`, { timeout: timeoutMs });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        const errBody = unwrapApiData<Record<string, unknown>>(json);
        setError(typeof errBody.error === 'string' ? errBody.error : 'Erreur chargement dashboard');
        setData(errBody as DashboardStatsPayload);
        return;
      }
      const payload = unwrapApiData<DashboardStatsPayload>(json);
      setData(payload);
      if (payload._warning) setError(String(payload._warning));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Timeout dashboard');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [enabled, period, from, to, timeoutMs]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}
