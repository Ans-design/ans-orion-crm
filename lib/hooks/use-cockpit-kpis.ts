'use client';

import { useCallback, useEffect, useState } from 'react';
import { unwrapApiData } from '@/lib/api-client';

type CockpitPayload = {
  kpis?: Record<string, number>;
  alertes?: { label: string; href: string; type?: string }[];
  [key: string]: unknown;
};

/** Charge cockpit/stats par rôle — données réelles, erreur explicite. */
export function useCockpitStats(role: string, query?: Record<string, string>) {
  const [data, setData] = useState<CockpitPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const qs = new URLSearchParams({ role, ...query }).toString();

  const reload = useCallback(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/cockpit/stats?${qs}`, { credentials: 'include', cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error('fetch failed');
        return r.json();
      })
      .then((d) => setData(unwrapApiData<CockpitPayload>(d)))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [qs]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    data,
    kpis: data?.kpis ?? {},
    alertes: data?.alertes ?? [],
    lists: (data?.lists as Record<string, unknown>) ?? {},
    sync: (data?.sync as Record<string, unknown>) ?? {},
    loading,
    error,
    reload,
  };
}

/** @deprecated utilisez useCockpitStats */
export function useCockpitKpis(role: string) {
  const { kpis, loading, error, reload } = useCockpitStats(role);
  return { kpis, loading, error, reload };
}
