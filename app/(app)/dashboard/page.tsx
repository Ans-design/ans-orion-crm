'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  TrendingUp, FileText, ClipboardList, AlertTriangle,
  ArrowUpRight, Factory, Receipt, Banknote, Truck, Activity, History,
  Calendar, Sparkles, RefreshCw, Package, Cpu, MessageSquareWarning,
  CalendarClock, Wallet, Percent, FileCheck, Users, ShoppingCart, Megaphone,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { formatPrice } from '@/lib/format/french-typography';
import { useCanViewMargin } from '@/hooks/use-can-view-margin';
import { useModuleDateFilter } from '@/components/layout/module-date-filter-context';
import { OrionEmptyState } from '@/components/orion';
import { AppKpiCard, AppActivityTile, AppLoadingState, AppButton, AppResponsiveKpiGrid } from '@/components/ui/app-ui';
import { OrionErrorBoundary } from '@/components/shared/orion-error-boundary';
import { DashboardHeader, type DashboardView } from '@/components/dashboard/dashboard-header';
import { RoleWelcomeBanner } from '@/components/dashboard/role-welcome-banner';
import { OrionOnboardingBanner } from '@/components/dashboard/orion-onboarding-banner';
import { DegradedDataBanner } from '@/components/dashboard/degraded-data-banner';
import { buildRoleWelcome } from '@/lib/cockpit/role-welcome';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import { unwrapApiData, getApiErrorMessage } from '@/lib/api-client';
import { useOrionDrawer, type OrionDrawerEntity } from '@/components/orion/orion-drawer-provider';
import { useOrionLiveRevision } from '@/lib/hooks/use-orion-live-revision';
import { computeEnterpriseHealth } from '@/lib/cockpit/enterprise-health';
import { readHonestKpi } from '@/lib/dashboard/honest-kpi';

const RhPointagePanel = dynamic(
  () => import('@/components/cockpit/rh-pointage-panel').then((m) => m.RhPointagePanel),
  { ssr: false, loading: () => null },
);

const CaChart = dynamic(() => import('@/components/dashboard/ca-chart'), {
  ssr: false,
  loading: () => <div className="h-48 orion-ds-skeleton" />,
});

/** Un charge unique pour la grille d’analyses (évite 4× dynamic chart-widgets). */
const DashboardChartsGrid = dynamic(
  () => import('@/components/dashboard/dashboard-charts-grid').then((m) => m.DashboardChartsGrid),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-accent/50 rounded-[7px]" /> },
);

const HorizontalRankChart = dynamic(
  () => import('@/components/dashboard/chart-widgets').then((m) => m.HorizontalRankChart),
  { ssr: false, loading: () => <div className="h-40 orion-ds-skeleton" /> },
);

const VerticalBarChart = dynamic(
  () => import('@/components/dashboard/chart-widgets').then((m) => m.VerticalBarChart),
  { ssr: false, loading: () => <div className="h-40 orion-ds-skeleton" /> },
);

const DualBarChart = dynamic(
  () => import('@/components/dashboard/chart-widgets').then((m) => m.DualBarChart),
  { ssr: false, loading: () => <div className="h-40 orion-ds-skeleton" /> },
);

const BoardSynthesis = dynamic(
  () => import('@/components/dashboard/board-synthesis').then((m) => m.BoardSynthesis),
  { ssr: false, loading: () => <div className="h-24 orion-ds-skeleton rounded-[7px]" /> },
);

const EnterpriseHealthScore = dynamic(
  () => import('@/components/dashboard/enterprise-health-score').then((m) => m.EnterpriseHealthScore),
  { ssr: false, loading: () => <div className="h-28 orion-ds-skeleton rounded-[7px]" /> },
);

const CockpitActions = dynamic(
  () => import('@/components/dashboard/cockpit-actions').then((m) => m.CockpitActions),
  { ssr: false, loading: () => null },
);

const GlobalActivityFeed = dynamic(
  () => import('@/components/dashboard/global-activity-feed').then((m) => m.GlobalActivityFeed),
  { ssr: false, loading: () => <div className="h-40 orion-ds-skeleton rounded-[7px]" /> },
);

const MaterialStatsPanel = dynamic(
  () => import('@/components/cockpit/material-stats-panel').then((m) => m.MaterialStatsPanel),
  { ssr: false, loading: () => null },
);

const CockpitAlerts = dynamic(
  () => import('@/components/dashboard/cockpit-alerts').then((m) => m.CockpitAlerts),
  { ssr: false, loading: () => null },
);

import type { TopArticleData, MachineStatusData } from '@/lib/dashboard/chart-aggregations';

type ChartPoint = { name: string; value: number };
type ChartData = {
  caChart: { label: string; value: number }[];
  caVsDepenses: { name: string; ca: number; depenses: number }[];
  caForecast?: { label: string; value: number; projected?: boolean }[];
  caForecastSummary?: { nextMonthLabel: string; projectedCa: number; trendPct: number | null };
  commandesByStatut: ChartPoint[];
  devisByStatut: ChartPoint[];
  livraisonsByStatut: ChartPoint[];
  machinesChart: ChartPoint[];
  chargesByCategory: ChartPoint[];
  topClients: { id: string; name: string; code: string; ca: number }[];
  topArticles: TopArticleData[];
  machinesStatus: MachineStatusData[];
  totalMachines: number;
  chartsUpdatedAt?: string;
  chartsPeriodLabel?: string;
  chartsHasEstimatedData?: boolean;
  caByCommercial?: { name: string; value: number }[];
  clientsByVille?: ChartPoint[];
  caByVille?: ChartPoint[];
  caByCanal?: ChartPoint[];
  caByCanalDecouverte?: ChartPoint[];
  inactiveClients?: { id: string; name: string; daysSince: number; lastCommandeNumero: string | null }[];
  impayesParClient?: ChartPoint[];
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Création', UPDATE: 'Modification', DELETE: 'Suppression',
  STATUS_CHANGE: 'Statut', ACCEPT: 'Acceptation', EXPORT: 'Export', ARCHIVE: 'Archivage',
};

type DashboardData = ChartData & {
  kpis: Record<string, number>;
  alertes: { type: string; label: string; href: string }[];
  recentCmds: { id: string; numero?: string; client: string; article: string; statut: string; avancement: number; priorite: string }[];
  recentPaiements: { id: string; commandeId?: string | null; montant: number; mode: string; client: string; facture?: string; date: string }[];
  livraisonsPrevues: { id: string; numero?: string; client: string; commande?: string; statut: string; datePrevue?: string; livreur?: string }[];
  recentAudit: { action: string; entity: string; entityId?: string; entityLabel?: string; userName?: string; createdAt: string }[];
  recentAnnonces?: { id: string; title: string; content: string; priority: string; authorName: string; createdAt: string; pinned: boolean }[];
  devisEnAttenteList?: { id: string; numero: string; client: string; statut: string; totalTTC: number; createdAt: string }[];
  rhPointage?: { presentsToday: number; retardsToday: number };
  commandePeakHours?: { hour: string; count: number }[];
  topVillesClients?: ChartPoint[];
  kpiDrawerHints?: Partial<Record<'commande' | 'facture' | 'bat' | 'stock' | 'machine' | 'livraison', string>>;
  emptyDatabase?: boolean;
  _warning?: string;
};

function getStatusColor(statut: string) {
  if (statut.includes('retard') || statut === 'Suspendu') return 'bg-[var(--ans-red)]/15 text-[var(--ans-red-vivid)]';
  if (statut === 'Livré' || statut === 'Prête') return 'bg-slate-500/15 text-slate-600 dark:text-slate-300';
  if (statut.includes('production') || statut.includes('Production')) return 'bg-[var(--ans-red)]/10 text-[var(--ans-red-vivid)]';
  return 'bg-[var(--ans-yellow)]/15 text-[var(--ans-yellow)]';
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
      <span className="w-1 h-4 rounded-full bg-[var(--brand-primary)]" />
      {children}
    </h2>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const canViewMargin = useCanViewMargin();
  const { openDrawer } = useOrionDrawer();
  const { filter, queryString, revision } = useModuleDateFilter();
  const liveTick = useOrionLiveRevision(
    ['commandes', 'devis', 'paiements', 'factures', 'livraisons', 'production'],
    { debounceMs: 4_000, focusMinMs: 60_000 },
  );
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [fetchErrorDetail, setFetchErrorDetail] = useState('');
  const [partialWarning, setPartialWarning] = useState('');
  const [view, setView] = useState<DashboardView>('executive');
  /** Analyses Recharts : fermées par défaut — ouverture à la demande (perf). */
  const [showMoreAnalytics, setShowMoreAnalytics] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);
  const fullLoadedRef = useRef(false);

  const loadLite = useCallback(() => {
    setLoading(true);
    setFetchError(false);
    setPartialWarning('');
    fetchWithTimeout(`/api/dashboard/summary?${queryString}`, {
      credentials: 'include',
      cache: 'no-store',
      timeout: 12_000,
    })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(getApiErrorMessage(body, `Erreur chargement (${r.status})`));
        return unwrapApiData<DashboardData>(body);
      })
      .then((lite) => {
        setData((prev) => {
          if (fullLoadedRef.current && prev) return prev;
          return { ...lite, _lite: true } as DashboardData & { _lite?: boolean };
        });
        setFetchError(false);
        setFetchErrorDetail('');
        setLastRefreshAt(new Date());
        setLoading(false);
      })
      .catch((err: Error) => {
        setFetchError(true);
        setFetchErrorDetail(err.message || 'Erreur réseau');
        setPartialWarning('');
        setLoading(false);
      });
  }, [queryString]);

  const loadFull = useCallback((opts?: { silent?: boolean }) => {
    if (!opts?.silent) setChartsLoading(true);
    fetchWithTimeout(`/api/dashboard/stats?${queryString}`, {
      credentials: 'include',
      cache: 'no-store',
      timeout: 28_000,
    })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) {
          const err = body?.error;
          const msg =
            getApiErrorMessage(body, '') ||
            (typeof err === 'string'
              ? err
              : typeof err?.message === 'string'
                ? err.message
                : typeof body?._warning === 'string'
                  ? body._warning
                  : `Erreur chargement (${r.status})`);
          throw new Error(msg || `Erreur chargement (${r.status})`);
        }
        return unwrapApiData<DashboardData>(body);
      })
      .then((stats) => {
        if (stats.emptyDatabase && stats._warning) {
          throw new Error(String(stats._warning));
        }
        fullLoadedRef.current = true;
        setData({ ...stats, _lite: false } as DashboardData & { _lite?: boolean });
        setFetchError(false);
        setFetchErrorDetail('');
        setLastRefreshAt(new Date());
        if (stats._warning) setPartialWarning(String(stats._warning));
        setLoading(false);
        setChartsLoading(false);
      })
      .catch((err: Error) => {
        if (!opts?.silent) setPartialWarning(err.message || 'Graphiques partiels');
        setChartsLoading(false);
        setLoading(false);
        setData((prev) => {
          if (!prev) {
            setFetchError(true);
            setFetchErrorDetail(err.message || 'Erreur réseau');
          }
          return prev;
        });
      });
  }, [queryString]);

  useEffect(() => {
    fullLoadedRef.current = false;
    loadLite();
  }, [loadLite, revision]);

  /** Full stats uniquement si analyses ouvertes — pas de scan DB idle. */
  useEffect(() => {
    if (!showMoreAnalytics) return;
    if (!fullLoadedRef.current) loadFull({ silent: false });
  }, [showMoreAnalytics, loadFull]);

  useEffect(() => {
    if (!liveTick) return;
    fetchWithTimeout(`/api/dashboard/summary?${queryString}`, {
      credentials: 'include',
      cache: 'no-store',
      timeout: 12_000,
    })
      .then(async (r) => {
        if (!r.ok) return null;
        const body = await r.json().catch(() => ({}));
        return unwrapApiData<DashboardData>(body);
      })
      .then((lite) => {
        if (!lite) return;
        setData((prev) => {
          if (!prev) return { ...lite, _lite: true } as DashboardData & { _lite?: boolean };
          return {
            ...prev,
            kpis: lite.kpis ?? prev.kpis,
            alertes: lite.alertes ?? prev.alertes,
            recentCmds: lite.recentCmds ?? prev.recentCmds,
            recentPaiements: lite.recentPaiements ?? prev.recentPaiements,
            livraisonsPrevues: lite.livraisonsPrevues ?? prev.livraisonsPrevues,
            recentAudit: lite.recentAudit ?? prev.recentAudit,
            rhPointage: lite.rhPointage ?? prev.rhPointage,
          };
        });
      })
      .catch(() => { /* silencieux */ });
  }, [liveTick, queryString]);

  useEffect(() => {
    if (!showMoreAnalytics) return;
    const intervalMs = 120_000;
    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadFull({ silent: true });
      }
    };
    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [loadFull, showMoreAnalytics]);

  const kpis = data?.kpis || {};
  const hints = data?.kpiDrawerHints ?? {};
  const isLite = Boolean((data as DashboardData & { _lite?: boolean } | null)?._lite);
  const kpiSource = {
    kpis,
    unavailable: fetchError && !data,
    lite: isLite,
  };
  const kpi = (...keys: string[]) => readHonestKpi(kpiSource, ...keys);
  const user = session?.user as { name?: string | null; role?: string } | undefined;
  const roleWelcome = buildRoleWelcome({
    role: user?.role,
    userName: user?.name,
    devisEnAttente: kpi('devisEnAttente') ?? 0,
    batEnAttente: kpi('batEnAttente') ?? 0,
    cmdAPlanifier: kpi('cmdAPlanifier') ?? 0,
    cmdActives: kpi('cmdActives') ?? 0,
    caDay: kpi('caDay') ?? 0,
    impayesClients: kpi('impayesClients') ?? 0,
    dossiersBloques: kpi('dossiersBloques') ?? 0,
  });

  const openAuditEntity = (entity: string, id: string) => {
    const map: Record<string, OrionDrawerEntity> = {
      Commande: 'commande',
      Client: 'client',
      Facture: 'facture',
      Livraison: 'livraison',
      Proof: 'bat',
      BAT: 'bat',
    };
    const key = map[entity];
    if (key) openDrawer(key, id);
    else router.push(`/historique?search=${encodeURIComponent(id)}`);
  };

  type KpiDef = {
    label: string;
    value: number | null;
    icon: typeof TrendingUp;
    color: string;
    format: 'price' | 'number';
    href: string;
    hint?: string;
    emptyHint?: string;
    drawerKey?: keyof typeof hints;
    drawerType?: OrionDrawerEntity;
  };

  const handleKpiClick = (stat: KpiDef) => {
    if (stat.value == null) return;
    const id = stat.drawerKey ? hints[stat.drawerKey] : undefined;
    if (stat.drawerType && id) openDrawer(stat.drawerType, id);
    else router.push(stat.href);
  };

  const periodKpiLabel = (() => {
    if (filter.dateFrom && filter.dateTo) return 'période';
    if (filter.period === 'day') return 'jour';
    if (filter.period === 'week') return '7 jours';
    if (filter.period === 'year') return 'année';
    if (filter.period === 'all') return 'période';
    return 'mois';
  })();

  const EXEC_KPIS: KpiDef[] = [
    { label: 'CA année', value: kpi('caYear'), icon: TrendingUp, color: 'var(--cps-title, #0F172A)', format: 'price', href: '/rapports', emptyHint: 'Aucune vente enregistrée sur l\'année' },
    { label: `CA commercial (${periodKpiLabel})`, value: kpi('caCommandesMonth'), icon: ShoppingCart, color: 'var(--primary, #FF174D)', format: 'price', href: '/commandes', emptyHint: `Aucune commande sur la ${periodKpiLabel}` },
    { label: `CA encaissé (${periodKpiLabel})`, value: kpi('caMonth'), icon: Calendar, color: 'var(--primary, #FF174D)', format: 'price', href: '/paiements', emptyHint: `Aucun encaissement sur la ${periodKpiLabel}` },
    ...(canViewMargin
      ? [{ label: 'Marge estimée', value: kpi('margeReellePct', 'margeGlobale'), icon: Percent, color: 'var(--cps-success, #16A34A)', format: 'number' as const, href: '/finance/couts-revient', hint: '%', emptyHint: 'Marge non calculable' }]
      : []),
    { label: 'Impayés clients', value: kpi('impayesClients', 'facturesImpayees'), icon: Receipt, color: 'var(--cps-danger, #DC2626)', format: 'price', href: '/factures?impayes=1', drawerKey: 'facture', drawerType: 'facture', emptyHint: 'Toutes les factures sont réglées' },
    { label: 'Effectifs présents', value: kpi('rhPresents'), icon: Users, color: 'var(--cps-amber, #F59E0B)', format: 'number', href: '/rh/employes', emptyHint: 'Aucun pointage aujourd\'hui' },
  ];

  const OPS_KPIS: KpiDef[] = [
    { label: 'En production', value: kpi('enProduction'), icon: Factory, color: 'var(--cps-amber, #F59E0B)', format: 'number', href: '/production', emptyHint: 'Aucun dossier en production' },
    { label: 'BAT en attente', value: kpi('batEnAttente'), icon: FileCheck, color: 'var(--cps-gold, #FACC15)', format: 'number', href: '/bat', emptyHint: 'Aucun BAT en attente' },
    { label: 'GPAO bloquée', value: kpi('dossiersBloques'), icon: Factory, color: 'var(--cps-danger, #DC2626)', format: 'number', href: '/production/dossiers?statut=Bloqué', emptyHint: 'Aucun dossier bloqué' },
    { label: 'Retards', value: kpi('cmdRetard'), icon: AlertTriangle, color: 'var(--cps-danger, #DC2626)', format: 'number', href: '/commandes?statut=En%20retard', emptyHint: 'Aucun retard signalé' },
    { label: 'À planifier', value: kpi('cmdAPlanifier'), icon: CalendarClock, color: 'var(--cps-amber, #F59E0B)', format: 'number', href: '/planning', emptyHint: 'Planning à jour' },
    { label: 'Alertes stock', value: kpi('stockCritique'), icon: Package, color: 'var(--cps-danger, #DC2626)', format: 'number', href: '/stock?critical=1', drawerKey: 'stock', drawerType: 'stock', emptyHint: 'Stock sous seuil OK' },
    { label: 'Machines HS', value: kpi('machinesDown'), icon: Cpu, color: 'var(--primary, #FF174D)', format: 'number', href: '/machines', drawerKey: 'machine', drawerType: 'machine', emptyHint: 'Parc machines opérationnel' },
    { label: 'Tâches bloquées', value: kpi('tachesBloquees'), icon: MessageSquareWarning, color: 'var(--cps-danger, #DC2626)', format: 'number', href: '/equipe/taches?status=Bloquée', emptyHint: 'Aucune tâche bloquée' },
  ];

  const FIN_KPIS: KpiDef[] = [
    { label: 'CA aujourd\'hui', value: kpi('caDay'), icon: Sparkles, color: 'var(--cps-success, #16A34A)', format: 'price', href: '/paiements', emptyHint: 'Pas de vente aujourd\'hui' },
    { label: 'CA semaine', value: kpi('caWeek'), icon: Calendar, color: 'var(--cps-title, #0F172A)', format: 'price', href: '/rapports', emptyHint: 'Pas de vente cette semaine' },
    { label: 'Factures impayées', value: kpi('facturesImpayees'), icon: Receipt, color: 'var(--primary, #FF174D)', format: 'price', href: '/factures?impayes=1', drawerKey: 'facture', drawerType: 'facture', emptyHint: 'Toutes les factures sont réglées' },
    { label: 'Créances échues', value: kpi('montantFacturesEchues'), icon: AlertTriangle, color: 'var(--cps-danger, #DC2626)', format: 'price', href: '/factures?overdue=1', emptyHint: 'Aucune facture échue' },
    { label: 'Factures en retard', value: kpi('facturesEnRetard'), icon: Calendar, color: 'var(--cps-amber, #F59E0B)', format: 'number', href: '/factures?overdue=1', emptyHint: 'Échéances à jour' },
    { label: `Trésorerie ${periodKpiLabel}`, value: kpi('tresorerieMois'), icon: Banknote, color: 'var(--cps-amber, #F59E0B)', format: 'price', href: '/workspace/finance', emptyHint: `Trésorerie non renseignée sur la ${periodKpiLabel}` },
    { label: 'Devis en attente', value: kpi('devisEnAttente'), icon: FileText, color: 'var(--cps-muted, #64748B)', format: 'number', href: '/devis', emptyHint: 'Aucun devis en attente' },
    { label: 'Taux conversion', value: kpi('tauxConversion'), icon: TrendingUp, color: 'var(--cps-success, #16A34A)', format: 'number', href: '/devis', hint: '%', emptyHint: 'Pas assez de données devis' },
  ];

  const activeKpis = view === 'operations' ? OPS_KPIS : view === 'finance' ? FIN_KPIS : EXEC_KPIS;

  if (loading) {
    return (
      <div className="dashboard-full">
        <AppLoadingState message="Chargement du cockpit…" hint="Agrégation ventes, production et alertes" />
      </div>
    );
  }

  const alertes = data?.alertes ?? [];

  return (
    <OrionErrorBoundary zone="dashboard">
    <div className="dashboard-full orion-module-page orion-ux-fade-in space-y-4 w-full max-w-none">
      <DashboardHeader
        view={view}
        onViewChange={setView}
        onRefresh={() => {
          fullLoadedRef.current = false;
          loadLite();
          loadFull({ silent: true });
        }}
        loading={loading}
        alertCount={alertes.length}
      />

      <p
        className="text-xs text-[var(--text-muted)] flex flex-wrap gap-x-3 gap-y-1 px-0.5"
        data-testid="dashboard-kpi-meta"
      >
        <span>
          Période KPI : <strong className="text-[var(--text-main)]">{periodKpiLabel}</strong>
          {isLite ? ' · mode résumé' : ' · mode complet'}
        </span>
        {lastRefreshAt ? (
          <span>
            Dernier rafraîchissement :{' '}
            <time dateTime={lastRefreshAt.toISOString()}>
              {lastRefreshAt.toLocaleString('fr-FR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </time>
          </span>
        ) : null}
      </p>

      <OrionOnboardingBanner />
      <RoleWelcomeBanner welcome={roleWelcome} />

      {partialWarning && !fetchError && (
        <DegradedDataBanner
          message={partialWarning}
          onRetry={() => {
            fullLoadedRef.current = false;
            loadLite();
          }}
          retrying={loading}
        />
      )}

      {fetchError && (
        <div className="cockpit-alert cockpit-alert-danger rounded-[7px] p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <AlertTriangle className="shrink-0" size={22} />
          <div className="flex-1">
            <p className="font-semibold text-sm">Statistiques partiellement indisponibles</p>
            <p className="text-xs mt-1 opacity-80">
              {fetchErrorDetail || 'Connexion base de données ou API — les modules restent accessibles.'}
            </p>
          </div>
          <AppButton type="button" variant="default" onClick={() => {
            fullLoadedRef.current = false;
            loadLite();
          }}>
            <RefreshCw size={13} /> Réessayer
          </AppButton>
        </div>
      )}

      <CockpitAlerts alertes={alertes} />

      {(data?.inactiveClients?.length ?? 0) > 0 && (
        <div className="bg-card border border-border rounded-[7px] p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Users size={16} className="text-[var(--primary,#FF174D)]" />
            Clients à relancer — inactifs 2 mois
          </h3>
          <ul className="space-y-2">
            {data!.inactiveClients!.slice(0, 6).map((c) => (
              <li key={c.id} className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => router.push(`/clients/${c.id}`)}
                  className="text-[var(--primary,#FF174D)] hover:underline font-medium"
                >
                  {c.name}
                </button>
                <span className="text-muted-foreground text-xs">
                  {c.daysSince} j — {c.lastCommandeNumero ? `CMD ${c.lastCommandeNumero}` : 'sans commande'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {view === 'executive' && data?.kpis && (
        <EnterpriseHealthScore
          health={computeEnterpriseHealth({
            devisEnAttente: data.kpis.devisEnAttente ?? 0,
            tauxConversion: data.kpis.tauxConversion ?? 0,
            dossiersBloques: data.kpis.dossiersBloques ?? 0,
            cmdRetard: data.kpis.cmdRetard ?? 0,
            batEnAttente: data.kpis.batEnAttente ?? 0,
            stockCritique: data.kpis.stockCritique ?? 0,
            impayesClients: data.kpis.impayesClients ?? 0,
            margeReellePct: data.kpis.margeReellePct ?? 0,
            rhRetards: data.kpis.rhRetards ?? 0,
            tachesBloquees: data.kpis.tachesBloquees ?? 0,
            livraisonsEnCours: data.kpis.livraisonsEnCours ?? 0,
          })}
        />
      )}

      {view !== 'board' && <CockpitActions />}

      {view === 'board' ? (
        <BoardSynthesis kpis={kpis} />
      ) : (
        <>
          <section>
            <SectionTitle>
              {view === 'executive' ? 'KPI Direction' : view === 'operations' ? 'KPI Opérations' : 'KPI Finance'}
            </SectionTitle>
            <AppResponsiveKpiGrid
              columns={4}
              phoneMax={3}
              more={
                activeKpis.length > 3 ? (
                  <button
                    type="button"
                    className="text-sm font-semibold text-[var(--accent-primary)] underline-offset-2 hover:underline min-h-[44px]"
                    onClick={() => setShowMoreAnalytics(true)}
                  >
                    Voir tous les KPI ({activeKpis.length})
                  </button>
                ) : null
              }
            >
              {activeKpis.map((stat, i) => (
                <AppKpiCard key={stat.label} {...stat} delay={i * 0.03} onClick={() => handleKpiClick(stat)} />
              ))}
            </AppResponsiveKpiGrid>
          </section>

          {data && view === 'executive' && (
            <div className="dashboard-grid">
              <div className="dashboard-chart-card card-span-4">
                <div className="dashboard-chart-card-header">
                  <h3 className="dashboard-chart-card-title">Annonces récentes</h3>
                </div>
                <div className="dashboard-chart-card-body">
                  {(data.recentAnnonces?.length ?? 0) === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">Aucune annonce active</p>
                  ) : (
                    <ul className="space-y-2 max-h-[200px] overflow-y-auto">
                      {data.recentAnnonces!.map((a) => (
                        <li key={a.id} className="cockpit-list-item text-xs">
                          <div className="flex items-center gap-2">
                            <Megaphone size={12} className="text-[var(--ans-red)] shrink-0" />
                            <span className="font-semibold truncate">{a.title}</span>
                            {a.pinned && <span className="text-xs font-medium text-amber-600">Épinglé</span>}
                          </div>
                          <p className="text-muted-foreground mt-1 line-clamp-2">{a.content}</p>
                          <p className="orion-text-meta mt-1">{a.authorName} · {new Date(a.createdAt).toLocaleDateString('fr-FR')}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="dashboard-chart-card card-span-4">
                <div className="dashboard-chart-card-header">
                  <h3 className="dashboard-chart-card-title">Devis en attente</h3>
                  <button type="button" onClick={() => router.push('/devis')} className="text-xs text-[var(--brand-primary)] hover:underline shrink-0">Voir tout</button>
                </div>
                <div className="dashboard-chart-card-body">
                  {(data.devisEnAttenteList?.length ?? 0) === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">Aucun devis en attente</p>
                  ) : (
                    <ul className="space-y-2 max-h-[200px] overflow-y-auto">
                      {data.devisEnAttenteList!.map((d) => (
                        <li key={d.id}>
                          <button type="button" onClick={() => router.push(`/devis?id=${d.id}`)}
                            className="cockpit-list-item w-full text-left text-xs">
                            <div className="flex justify-between gap-2">
                              <span className="font-mono text-[var(--info)]">{d.numero}</span>
                              <span className="font-semibold">{formatPrice(d.totalTTC)}</span>
                            </div>
                            <p className="text-muted-foreground mt-0.5">{d.client} · {d.statut}</p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="dashboard-chart-card card-span-4">
                <RhPointagePanel
                  presentsToday={data.rhPointage?.presentsToday ?? kpis.rhPresents}
                  retardsToday={data.rhPointage?.retardsToday ?? kpis.rhRetards}
                  embedded
                />
              </div>
            </div>
          )}

          {data && view === 'executive' && (
            <div className="flex justify-center">
              <AppButton
                type="button"
                variant="outline"
                onClick={() => setShowMoreAnalytics((v) => !v)}
                aria-expanded={showMoreAnalytics}
              >
                {showMoreAnalytics ? 'Réduire les analyses' : 'Voir les analyses détaillées'}
              </AppButton>
            </div>
          )}

          {data && view === 'executive' && showMoreAnalytics && (
            <DashboardChartsGrid
              data={data}
              chartsLoading={chartsLoading}
              chartsError={fetchError}
              onRefresh={() => loadFull({ silent: false })}
            />
          )}

          {data && view === 'operations' && (
            <div className="dashboard-grid">
              <div className="dashboard-chart-card card-span-12">
                <div className="dashboard-chart-card-header">
                  <h3 className="dashboard-chart-card-title">Exécution temps réel</h3>
                </div>
                <div className="dashboard-chart-card-body flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <p className="text-sm text-muted-foreground">
                    Le détail ops (urgences, pointage, file) vit dans le module Opérations — pas de second cockpit ici.
                  </p>
                  <AppButton type="button" onClick={() => router.push('/operations')}>
                    Voir les opérations
                    <ArrowUpRight size={14} className="ml-1.5" />
                  </AppButton>
                </div>
              </div>
              <div className="dashboard-chart-card card-span-4">
                <div className="dashboard-chart-card-header">
                  <h3 className="dashboard-chart-card-title">Progression CA</h3>
                </div>
                <div className="dashboard-chart-card-body">
                  <div className="flex items-center gap-3 py-2">
                    <Percent size={28} className={kpis.caProgressPct >= 0 ? 'text-slate-600 dark:text-slate-300' : 'text-red-500'} />
                    <div>
                      <p className={`text-body-l font-bold ${kpis.caProgressPct >= 0 ? 'text-slate-700 dark:text-slate-200' : 'text-red-600'}`}>
                        {kpis.caProgressPct > 0 ? '+' : ''}{kpis.caProgressPct ?? 0}%
                      </p>
                      <p className="text-meta text-muted-foreground">vs mois précédent · charge {kpis.plannedWorkloadHours ?? 0} h planifiées</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="dashboard-chart-card card-span-8">
                <div className="dashboard-chart-card-header">
                  <h3 className="dashboard-chart-card-title">Raccourcis ops</h3>
                </div>
                <div className="dashboard-chart-card-body">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <AppActivityTile icon={CalendarClock} value={kpi('enProduction') ?? 0} label="Planning" color="var(--primary, #FF174D)" onClick={() => router.push('/planning')} />
                  <AppActivityTile icon={Package} value={kpi('stockCritique') ?? 0} label="Stock" color="var(--cps-danger, #DC2626)" onClick={() => hints.stock ? openDrawer('stock', hints.stock) : router.push('/stock')} />
                  <AppActivityTile icon={Cpu} value={kpi('machinesDown') ?? 0} label="Machines" color="var(--cps-amber, #F59E0B)" onClick={() => hints.machine ? openDrawer('machine', hints.machine) : router.push('/machines')} />
                  <AppActivityTile icon={Truck} value={kpi('livraisonsEnCours') ?? 0} label="Livraisons" color="var(--cps-title, #0F172A)" onClick={() => hints.livraison ? openDrawer('livraison', hints.livraison) : router.push('/livraisons')} />
                </div>
                </div>
              </div>
            </div>
          )}

          {data && view === 'operations' && (
            <div className="flex justify-center">
              <AppButton
                type="button"
                variant="outline"
                onClick={() => setShowMoreAnalytics((v) => !v)}
                aria-expanded={showMoreAnalytics}
              >
                {showMoreAnalytics ? 'Réduire le détail ops' : 'Voir plus (activité & commandes)'}
              </AppButton>
            </div>
          )}

          {data && view === 'operations' && showMoreAnalytics && (
            <div className="dashboard-grid">
              <div className="dashboard-chart-card card-span-6">
                <div className="dashboard-chart-card-header">
                  <h3 className="dashboard-chart-card-title">Heures de pointe commandes</h3>
                </div>
                <div className="dashboard-chart-card-body">
                  <VerticalBarChart
                    data={(data.commandePeakHours ?? []).map((h) => ({ name: h.hour, value: h.count }))}
                    emptyLabel="Aucune commande récente"
                  />
                </div>
              </div>
              <MaterialStatsPanel months={3} />
              <div className="dashboard-chart-card card-span-6">
                <GlobalActivityFeed
                  items={data.recentAudit ?? []}
                  onOpenEntity={openAuditEntity}
                />
              </div>
              <div className="dashboard-chart-card card-span-6">
                <div className="dashboard-chart-card-header">
                  <h3 className="dashboard-chart-card-title">Commandes en cours</h3>
                </div>
                <div className="dashboard-chart-card-body">
                {(data.recentCmds?.length ?? 0) === 0 ? (
                  <OrionEmptyState icon={ClipboardList} title="Aucune commande active" description="Les commandes apparaîtront après validation d'un devis ou proforma." action={<AppButton type="button" onClick={() => router.push('/devis')}>Ouvrir Devis</AppButton>} />
                ) : (
                  <div className="space-y-2 max-h-[320px] overflow-y-auto">
                    {data.recentCmds.map((order) => (
                      <button key={order.id} type="button" onClick={() => openDrawer('commande', order.id)}
                        className="cockpit-list-item active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2">
                        <div className="flex justify-between gap-2">
                          <span className="font-mono text-xs text-[var(--info)]">{order.numero ?? order.id}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(order.statut)}`}>{order.statut}</span>
                        </div>
                        <div className="text-sm font-medium mt-1 text-[var(--text-primary)]">{order.client}</div>
                        <div className="text-xs text-[var(--text-secondary)] truncate">{order.article}</div>
                      </button>
                    ))}
                  </div>
                )}
                </div>
              </div>
            </div>
          )}

          {data && view === 'finance' && (
            <div className="dashboard-grid">
              <div className="dashboard-chart-card card-span-6">
                <div className="dashboard-chart-card-header">
                  <div>
                    <h3 className="dashboard-chart-card-title">CA — 7 derniers jours</h3>
                    <p className="dashboard-chart-card-subtitle">Encaissements</p>
                  </div>
                </div>
                <div className="dashboard-chart-card-body min-w-0">
                  <CaChart data={data.caChart ?? []} />
                </div>
              </div>
              <div className="dashboard-chart-card card-span-6">
                <div className="dashboard-chart-card-header">
                  <div>
                    <h3 className="dashboard-chart-card-title">CA vs Dépenses</h3>
                    <p className="dashboard-chart-card-subtitle">6 derniers mois</p>
                  </div>
                </div>
                <div className="dashboard-chart-card-body min-w-0">
                  <DualBarChart data={data.caVsDepenses ?? []} />
                </div>
              </div>
              <div className="dashboard-chart-card card-span-6">
                <div className="dashboard-chart-card-header">
                  <h3 className="dashboard-chart-card-title">Impayés par client</h3>
                </div>
                <div className="dashboard-chart-card-body min-w-0">
                  <HorizontalRankChart data={data.impayesParClient ?? []} formatPriceValues emptyLabel="Aucun impayé" />
                </div>
              </div>
              <div className="dashboard-chart-card card-span-6">
                <div className="dashboard-chart-card-header">
                  <h3 className="dashboard-chart-card-title">Top clients (CA mois)</h3>
                </div>
                <div className="dashboard-chart-card-body min-w-0">
                  <HorizontalRankChart
                    data={(data.topClients ?? []).map((c) => ({ name: c.name, value: Number(c.ca) || 0 }))}
                    formatPriceValues
                    emptyLabel="Aucun client"
                  />
                </div>
              </div>
            </div>
          )}

          {data && view === 'finance' && (
            <div className="flex justify-center">
              <AppButton
                type="button"
                variant="outline"
                onClick={() => setShowMoreAnalytics((v) => !v)}
                aria-expanded={showMoreAnalytics}
              >
                {showMoreAnalytics ? 'Réduire le détail finance' : 'Voir créances & paiements'}
              </AppButton>
            </div>
          )}

          {data && view === 'finance' && showMoreAnalytics && (
            <div className="dashboard-grid">
              <div className="dashboard-chart-card card-span-6">
                <h3 className="orion-text-card-title mb-3">Créances par client</h3>
                {(data.impayesParClient ?? []).length > 0 ? (
                  <HorizontalRankChart data={data.impayesParClient ?? []} formatPriceValues />
                ) : (
                  <p className="text-xs text-muted-foreground">Aucune créance client en cours</p>
                )}
              </div>
              <div className="dashboard-chart-card card-span-6">
                <h3 className="orion-text-card-title mb-3">Paiements récents</h3>
                <div className="space-y-2">
                  {(data.recentPaiements ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">Aucun paiement récent</p>
                  ) : (data.recentPaiements ?? []).slice(0, 5).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => router.push(
                        p.commandeId ? `/commandes/${p.commandeId}?tab=finance` : '/paiements',
                      )}
                      className="cockpit-list-item text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2">
                      <div className="flex justify-between font-medium text-[var(--text-primary)]">
                        <span>{p.client}</span>
                        <span>{formatPrice(p.montant)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="dashboard-chart-card card-span-6">
                <h3 className="orion-text-card-title mb-3">Top clients</h3>
                <div className="space-y-2">
                  {data.topClients.map((c) => (
                    <button key={c.id} type="button" onClick={() => openDrawer('client', c.id)}
                      className="cockpit-list-item flex justify-between text-xs text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2">
                      <span className="font-medium truncate text-[var(--text-primary)]">{c.name}</span>
                      <span className="font-mono text-[var(--text-secondary)]">{formatPrice(c.ca)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {view === 'executive' && data && showMoreAnalytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <GlobalActivityFeed
                items={data.recentAudit ?? []}
                onOpenEntity={openAuditEntity}
                maxHeight="max-h-[200px]"
              />
              <div className="dashboard-chart-card md:col-span-1 xl:col-span-3">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="orion-text-card-title">Livraisons prévues</h2>
                  <button type="button" onClick={() => router.push('/livraisons')} className="text-xs text-[var(--brand-primary)] hover:underline flex items-center gap-1 font-medium">
                    Voir tout <ArrowUpRight size={12} />
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {(data.livraisonsPrevues ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground col-span-full py-4 text-center">Aucune livraison prévue</p>
                  ) : (data.livraisonsPrevues ?? []).map((l) => (
                    <button key={l.id} type="button" onClick={() => openDrawer('livraison', l.id)}
                      className="cockpit-list-item text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2">
                      <div className="font-mono text-[var(--info)]">{l.numero ?? l.id}</div>
                      <div className="font-medium mt-1 text-[var(--text-primary)]">{l.client}</div>
                      <div className="text-[var(--text-secondary)]">{l.statut}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
    </OrionErrorBoundary>
  );
}
