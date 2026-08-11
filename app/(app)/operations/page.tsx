'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity, AlertTriangle, ArrowRight, BarChart3, Clock, MapPin, Percent, RefreshCw, TrendingUp,
} from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { ANS, ANS_KPI_COLORS } from '@/lib/ans-colors';
import { formatPrice } from '@/lib/format/french-typography';
import dynamic from 'next/dynamic';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import { RhPointagePanel } from '@/components/cockpit/rh-pointage-panel';
import { FlowContextBanner } from '@/components/flow/flow-context-banner';
import { useCanViewFinancialKPIs } from '@/hooks/use-can-view-margin';
import { formatDateTimeFR } from '@/lib/formatters';

const VerticalBarChart = dynamic(
  () => import('@/components/dashboard/chart-widgets').then((m) => m.VerticalBarChart),
  { ssr: false, loading: () => <div className="h-40 animate-pulse bg-accent/50 rounded-lg" /> },
);

const HorizontalRankChart = dynamic(
  () => import('@/components/dashboard/chart-widgets').then((m) => m.HorizontalRankChart),
  { ssr: false, loading: () => <div className="h-32 animate-pulse bg-accent/50 rounded-lg" /> },
);

type OpsData = {
  urgentCount: number;
  alertes: { type: string; label: string; href: string }[];
  kpis: Record<string, number>;
  canViewFinancialKPIs?: boolean;
  realtime?: {
    commandePeakHours: { hour: string; count: number }[];
    plannedWorkloadHours: number;
    commandesEnCours: {
      id: string; numero: string; client: string; article: string;
      statut: string; avancement: number; priorite: string; total?: number;
    }[];
    topVillesClients: { name: string; value: number }[];
    caProgressPct?: number;
    caMonth?: number;
    rhPointage: { presentsToday: number; retardsToday: number };
  };
};

const OPS_POLL_MS = 60_000;

export default function OperationsPage() {
  const router = useRouter();
  const canViewFinance = useCanViewFinancialKPIs();
  const [data, setData] = useState<OpsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback((opts?: { silent?: boolean }) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    if (opts?.silent) setRefreshing(true);
    else {
      setLoading(true);
      setFetchError(false);
    }

    fetchWithTimeout('/api/cockpit/stats?mode=operations', {
      credentials: 'include',
      timeout: 12_000,
      signal: ac.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setData(d);
        setFetchError(false);
        setUpdatedAt(new Date());
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setFetchError(true);
        if (!opts?.silent) setData(null);
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  useEffect(() => {
    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        load({ silent: true });
      }
    };
    const id = window.setInterval(tick, OPS_POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const kpis = data?.kpis ?? {};
  const rt = data?.realtime;
  const showFinance = canViewFinance && data?.canViewFinancialKPIs !== false;
  const topAlert = data?.alertes?.[0];

  if (loading && !data) {
    return (
      <div className="dashboard-full space-y-5 w-full animate-pulse">
        <div className="h-16 bg-accent rounded-[7px]" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-accent rounded-[7px]" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-full space-y-5 w-full">
      {fetchError && (
        <div className="rounded-[7px] border border-orange-500/30 bg-orange-500/5 p-4 text-sm text-orange-600">
          Impossible de charger les opérations temps réel.{' '}
          <button type="button" onClick={() => load()} className="underline font-semibold">Réessayer</button>
        </div>
      )}
      <header className="pb-4 border-b border-border flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Activity size={26} style={{ color: ANS.red }} />
            Opérations temps réel
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Charge atelier, heures de pointe, commandes en cours
            {showFinance ? ' et progression CA' : ''}
          </p>
          {updatedAt ? (
            <p className="text-xs text-muted-foreground mt-1">
              Dernière mise à jour : {formatDateTimeFR(updatedAt)}
              {refreshing ? ' · Actualisation…' : ''}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => load({ silent: true })}
          className="inline-flex items-center gap-2 rounded-[7px] border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
          aria-label="Actualiser les opérations"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : undefined} />
          Actualiser
        </button>
      </header>

      <FlowContextBanner
        processStep="Pilotage → Opérations"
        status={fetchError ? 'Chargement partiel' : `${data?.urgentCount ?? 0} urgences`}
        nextAction={
          topAlert
            ? {
                id: 'ops-alert',
                label: topAlert.label,
                href: topAlert.href,
                description: 'Alerte prioritaire atelier',
                module: 'pilotage',
                priority: 'high',
              }
            : data?.realtime?.commandesEnCours?.[0]
              ? {
                  id: 'ops-commande',
                  label: `Ouvrir ${data.realtime.commandesEnCours[0].numero}`,
                  href: `/commandes/${data.realtime.commandesEnCours[0].id}`,
                  description: 'Commande active',
                  module: 'pilotage',
                  priority: 'medium',
                }
              : {
                  id: 'ops-cockpit',
                  label: 'Voir le cockpit',
                  href: '/dashboard',
                  description: 'Synthèse direction',
                  module: 'pilotage',
                  priority: 'low',
                }
        }
        impactedModules={['commandes', 'production', 'bat']}
      />

      <div className="orion-kpi-grid kpi-grid">
        <KpiCard label="Urgences actives" value={data?.urgentCount ?? 0} icon={AlertTriangle} color={ANS.red} />
        <KpiCard label="Commandes urgentes" value={kpis.cmdUrgentes || 0} icon={Activity} color={ANS.orange} onClick={() => router.push('/commandes')} />
        <KpiCard label="Charge planifiée" value={kpis.plannedWorkloadHours || 0} icon={Clock} color={ANS.cyan} hint="h" />
        {showFinance ? (
          <KpiCard label="Progression CA" value={kpis.caProgressPct || 0} icon={Percent} color={ANS_KPI_COLORS.success} hint="%" />
        ) : null}
        <KpiCard label="Tâches bloquées" value={kpis.tachesBloquees || 0} icon={AlertTriangle} color={ANS.red} onClick={() => router.push('/equipe/taches?status=Bloquée')} />
        <KpiCard label="BAT en attente" value={kpis.batEnAttente || 0} icon={Activity} color={ANS.cyan} onClick={() => router.push('/bat')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RhPointagePanel
          presentsToday={rt?.rhPointage.presentsToday}
          retardsToday={rt?.rhPointage.retardsToday}
          className="lg:col-span-1"
        />
        <div className="ans-card-premium p-4 lg:col-span-2">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <BarChart3 size={16} /> Heures de pointe des commandes (7 j)
          </h3>
          <VerticalBarChart
            data={(rt?.commandePeakHours ?? []).map((h) => ({ name: h.hour, value: h.count }))}
            emptyLabel="Aucune commande sur la période"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="ans-card-premium overflow-hidden ops-list-card">
          <div className="ops-list-card__head">
            <h2 className="font-semibold text-sm">Commandes en cours</h2>
            <button type="button" onClick={() => router.push('/commandes')} className="text-xs text-[var(--brand-primary)] hover:underline">
              Voir tout
            </button>
          </div>
          {(rt?.commandesEnCours?.length ?? 0) === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Aucune commande active</div>
          ) : (
            <div className="ops-list-card__body max-h-[360px] overflow-y-auto">
              {rt!.commandesEnCours.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => router.push(`/commandes/${c.id}`)}
                  className="ops-list-item"
                  aria-label={`Ouvrir la commande ${c.numero}`}
                >
                  <div className="ops-list-item__main min-w-0">
                    <div className="ops-list-item__top">
                      <span className="ops-list-item__ref">{c.numero}</span>
                      <span className="ops-list-item__pct">{c.avancement}%</span>
                    </div>
                    <p className="ops-list-item__title truncate">{c.client}</p>
                    <p className="ops-list-item__meta truncate">{c.article}</p>
                    <div className="ops-list-item__bar" aria-hidden>
                      <span style={{ width: `${Math.min(100, Math.max(0, c.avancement))}%` }} />
                    </div>
                  </div>
                  {showFinance && typeof c.total === 'number' ? (
                    <span className="ops-list-item__amount shrink-0">{formatPrice(c.total)}</span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="ans-card-premium p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <MapPin size={16} /> Top villes clients
            </h3>
            <HorizontalRankChart data={rt?.topVillesClients ?? []} emptyLabel="Aucune ville renseignée" />
          </div>
          {showFinance ? (
            <div className="ans-card-premium p-4 flex items-center gap-3">
              <TrendingUp size={24} style={{ color: ANS_KPI_COLORS.success }} />
              <div>
                <p className="text-sm font-medium">CA du mois</p>
                <p className="text-lg font-bold">{formatPrice(rt?.caMonth ?? 0)}</p>
                <p className={`text-xs ${(kpis.caProgressPct ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(kpis.caProgressPct ?? 0) > 0 ? '+' : ''}{kpis.caProgressPct ?? 0}% vs mois précédent
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="ans-card-premium overflow-hidden ops-list-card">
        <div className="ops-list-card__head">
          <h2 className="font-semibold text-sm">File d&apos;actions prioritaires</h2>
        </div>
        {(data?.alertes?.length ?? 0) === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Aucune urgence — atelier sous contrôle</div>
        ) : (
          <div className="ops-priority-grid">
            {data!.alertes.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => router.push(a.href)}
                className="ops-priority-chip"
              >
                <span className="ops-priority-chip__icon" aria-hidden>
                  <AlertTriangle size={15} />
                </span>
                <span className="ops-priority-chip__label">{a.label}</span>
                <ArrowRight size={14} className="ops-priority-chip__arrow" aria-hidden />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
