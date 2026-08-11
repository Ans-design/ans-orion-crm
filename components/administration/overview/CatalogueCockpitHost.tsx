'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  CockpitStudio,
  type CockpitPriority,
} from '@/components/admin/catalogue-prix-stock/CockpitStudio';
import type { KpiId, KpiItem } from '@/components/admin/catalogue-prix-stock/KpiCards';
import type { SyncBadgeStatus } from '@/components/admin/catalogue-prix-stock/AdminHeader';
import '@/components/admin/catalogue-prix-stock/catalogue-prix-stock-light.css';

/**
 * Héberge le cockpit Catalogue Prix & Stock — fusionné dans OverviewUnifiedWorkspace
 * (sidebar Macro « Vue d'ensemble »), sans remplacer la supervision Admin.
 */
export function CatalogueCockpitHost({ embedded = true }: { embedded?: boolean }) {
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const canEdit = role === 'admin' || role === 'manager' || role === 'direction';

  const [syncStatus, setSyncStatus] = useState<SyncBadgeStatus>('pending');
  const [activeKpi, setActiveKpi] = useState<KpiId | null>(null);
  const [priorities, setPriorities] = useState<CockpitPriority[]>([]);
  const [kpis, setKpis] = useState({
    articlesPos: '—' as number | string,
    optionsActives: '—' as number | string,
    matieres: '—' as number | string,
    prixManquants: '—' as number | string,
    anomalies: '—' as number | string,
    doublons: '—' as number | string,
  });
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const cockpitRes = await fetch('/api/admin/catalogue/cockpit', { cache: 'no-store' });
      if (cockpitRes.ok) {
        const body = await cockpitRes.json();
        const d = body?.data ?? {};
        setKpis((prev) => ({
          articlesPos: d.articlesPos ?? 0,
          optionsActives: d.optionsActives ?? prev.optionsActives,
          matieres: d.matieres ?? 0,
          prixManquants: d.prixManquants ?? d.matieresSansPrix ?? 0,
          anomalies: d.anomalies ?? 0,
          doublons: prev.doublons === '—' ? 0 : prev.doublons,
        }));
        if (Array.isArray(d.priorities)) {
          setPriorities(
            d.priorities.filter(
              (p: CockpitPriority) => p && typeof p.count === 'number' && p.count > 0,
            ),
          );
        }
      }

      const [dupRes, chipsRes] = await Promise.all([
        fetch('/api/admin-backoffice/catalogue-pos/import-excel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'detect-duplicates' }),
        }).catch(() => null),
        fetch('/api/admin-backoffice/options/chips?limit=1', { cache: 'no-store' }).catch(() => null),
      ]);
      const dup = dupRes?.ok ? await dupRes.json() : null;
      const chips = chipsRes?.ok ? await chipsRes.json() : null;
      setKpis((prev) => ({
        ...prev,
        optionsActives:
          chips?.data?.counts?.active ?? chips?.data?.total ?? prev.optionsActives ?? 0,
        doublons: dup?.data?.critical ?? prev.doublons ?? 0,
      }));
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/admin-backoffice/sync-diagnostics', { cache: 'no-store' });
        if (!r.ok || cancelled) return;
        const body = await r.json();
        const status = body?.data?.status as SyncBadgeStatus | undefined;
        if (status === 'synced' || status === 'pending' || status === 'error') {
          setSyncStatus(status);
        }
      } catch {
        /* keep pending */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const kpiItems: KpiItem[] = useMemo(
    () => [
      { id: 'articles', label: 'Articles POS', value: kpis.articlesPos },
      { id: 'options', label: 'Options / Chips', value: kpis.optionsActives },
      { id: 'matieres', label: 'Matières Actives', value: kpis.matieres },
      {
        id: 'missing-prices',
        label: 'Prix Manquants',
        value: kpis.prixManquants,
        tone: Number(kpis.prixManquants) > 0 ? 'warn' : 'default',
        hint: Number(kpis.prixManquants) > 0 ? 'À configurer' : undefined,
      },
      {
        id: 'anomalies',
        label: 'Anomalies',
        value: kpis.anomalies,
        tone: Number(kpis.anomalies) > 0 ? 'danger' : 'default',
      },
      {
        id: 'doublons',
        label: 'Doublons',
        value: kpis.doublons,
        tone: Number(kpis.doublons) > 0 ? 'warn' : 'default',
      },
    ],
    [kpis],
  );

  const openStudio = useCallback(
    (studio: string, tab: string, view?: string) => {
      const params = new URLSearchParams();
      params.set('studio', studio);
      params.set('tab', tab);
      if (view) params.set('view', view);
      router.push(`/administration/catalogue-prix-stock?${params.toString()}`);
    },
    [router],
  );

  const onKpiSelect = useCallback(
    (id: KpiId) => {
      setActiveKpi(id);
      if (id === 'articles') openStudio('articles', 'articles');
      else if (id === 'options') openStudio('finitions', 'finitions');
      else if (id === 'matieres' || id === 'missing-prices') openStudio('matieres', 'matieres');
      else if (id === 'anomalies' || id === 'doublons') openStudio('excel', 'anomalies');
    },
    [openStudio],
  );

  return (
    <div className="cps-theme orion-bleed w-full max-w-none min-w-0 space-y-3">
      {!loaded ? (
        <div className="space-y-3 p-4" role="status" aria-busy="true" aria-label="Chargement vue d’ensemble">
          <div className="cps-skeleton h-8 w-48" />
          <div className="cps-skeleton h-4 w-full max-w-xl" />
          <div className="cps-skeleton h-40 w-full" />
        </div>
      ) : (
        <CockpitStudio
          canEdit={canEdit}
          kpiItems={kpiItems}
          activeKpi={activeKpi}
          onKpiSelect={onKpiSelect}
          syncStatus={syncStatus}
          onOpenStudio={openStudio}
          priorities={priorities}
          embedded={embedded}
        />
      )}
    </div>
  );
}
