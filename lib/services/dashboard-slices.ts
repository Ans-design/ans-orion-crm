import { getDashboardStats } from '@/lib/services/dashboard-stats';
import { getDashboardLiteStats } from '@/lib/services/dashboard-stats-lite';
import type { ModuleDatePeriod } from '@/lib/date-filter';

type DateRange = { from?: Date; to?: Date };

type DashboardFullStats = Awaited<ReturnType<typeof getDashboardStats>>;
type DashboardLiteStats = Awaited<ReturnType<typeof getDashboardLiteStats>>;

/** Cache court — absorbe le refresh dashboard sans recharger la DB à chaque tick. */
const SLICE_CACHE_TTL_MS = 45_000;
const LITE_CACHE_TTL_MS = 15_000;
const liteCache = new Map<string, { expires: number; data: DashboardLiteStats }>();
const liteInFlight = new Map<string, Promise<DashboardLiteStats>>();
const sliceCache = new Map<string, { expires: number; data: DashboardFullStats }>();
const sliceInFlight = new Map<string, Promise<DashboardFullStats>>();

function sliceCacheKey(period: ModuleDatePeriod, dateRange?: DateRange): string {
  return `${period}:${dateRange?.from?.toISOString() ?? ''}:${dateRange?.to?.toISOString() ?? ''}`;
}

/** Charge getDashboardStats une fois — cache court + dédup requêtes parallèles (slices). */
export async function loadDashboardFullStats(
  period: ModuleDatePeriod = 'week',
  dateRange?: DateRange,
): Promise<DashboardFullStats> {
  const key = sliceCacheKey(period, dateRange);
  const hit = sliceCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.data;

  const pending = sliceInFlight.get(key);
  if (pending) return pending;

  const promise = getDashboardStats(period, dateRange)
    .then((data) => {
      sliceCache.set(key, { data, expires: Date.now() + SLICE_CACHE_TTL_MS });
      return data;
    })
    .finally(() => {
      sliceInFlight.delete(key);
    });

  sliceInFlight.set(key, promise);
  return promise;
}

/** Vide le cache slices (tests + invalidation temps réel). */
export function clearDashboardSliceCache(): void {
  sliceCache.clear();
  sliceInFlight.clear();
  liteCache.clear();
  liteInFlight.clear();
}

/** Alias explicite pour invalidation après MAJ métier. */
export const invalidateDashboardKpiCache = clearDashboardSliceCache;

/** Premier paint dashboard — sans graphiques / géo / coûts. */
export async function loadDashboardLiteStats(
  period: ModuleDatePeriod = 'week',
  dateRange?: DateRange,
): Promise<DashboardLiteStats> {
  const key = sliceCacheKey(period, dateRange);
  const hit = liteCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.data;

  const pending = liteInFlight.get(key);
  if (pending) return pending;

  const promise = getDashboardLiteStats(period, dateRange)
    .then((data) => {
      liteCache.set(key, { data, expires: Date.now() + LITE_CACHE_TTL_MS });
      return data;
    })
    .finally(() => {
      liteInFlight.delete(key);
    });

  liteInFlight.set(key, promise);
  return promise;
}

export async function getDashboardSummary(period: ModuleDatePeriod = 'week', dateRange?: DateRange) {
  const lite = await loadDashboardLiteStats(period, dateRange);
  return {
    period: lite.period,
    kpis: lite.kpis,
    alertes: lite.alertes,
    recentCmds: lite.recentCmds,
    recentPaiements: lite.recentPaiements,
    livraisonsPrevues: lite.livraisonsPrevues,
    recentAudit: lite.recentAudit,
    kpiDrawerHints: lite.kpiDrawerHints,
    recentAnnonces: lite.recentAnnonces ?? [],
    devisEnAttenteList: lite.devisEnAttenteList ?? [],
    rhPointage: lite.rhPointage,
    chartsPeriodLabel: lite.chartsPeriodLabel,
    _lite: true,
  };
}

export async function getDashboardSalesSlice(period: ModuleDatePeriod = 'week', dateRange?: DateRange) {
  const full = await loadDashboardFullStats(period, dateRange);
  return {
    caChart: full.caChart,
    topClients: full.topClients,
    topArticles: full.topArticles,
    caByCommercial: full.caByCommercial,
    clientsByVille: full.clientsByVille,
    caByVille: full.caByVille,
    caByCanal: full.caByCanal,
    caByCanalDecouverte: full.caByCanalDecouverte,
    inactiveClients: full.inactiveClients,
    commandesByStatut: full.commandesByStatut,
    devisByStatut: full.devisByStatut,
    commandePeakHours: full.commandePeakHours,
    topVillesClients: full.topVillesClients,
    chartsUpdatedAt: full.chartsUpdatedAt,
  };
}

export async function getDashboardProductionSlice(period: ModuleDatePeriod = 'week', dateRange?: DateRange) {
  const full = await loadDashboardFullStats(period, dateRange);
  return {
    machinesStatus: full.machinesStatus,
    totalMachines: full.totalMachines,
    machinesChart: full.machinesChart,
    chartsUpdatedAt: full.chartsUpdatedAt,
  };
}

export async function getDashboardFinanceSlice(period: ModuleDatePeriod = 'week', dateRange?: DateRange) {
  const full = await loadDashboardFullStats(period, dateRange);
  return {
    caVsDepenses: full.caVsDepenses,
    chartsHasEstimatedData: full.chartsHasEstimatedData,
    chargesByCategory: full.chargesByCategory,
    impayesParClient: full.impayesParClient,
    chartsUpdatedAt: full.chartsUpdatedAt,
  };
}

export async function getDashboardStockSlice(period: ModuleDatePeriod = 'week', dateRange?: DateRange) {
  const full = await loadDashboardFullStats(period, dateRange);
  return {
    livraisonsByStatut: full.livraisonsByStatut,
    stockCritique: full.kpis.stockCritique,
    chartsUpdatedAt: full.chartsUpdatedAt,
  };
}
