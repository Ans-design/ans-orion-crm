/** Filtre de période partagé entre modules (dashboard, commandes, rapports, clients). */

export type ModuleDatePeriod = 'day' | 'week' | 'month' | 'year' | 'all';

export type ModuleDateFilter = {
  period: ModuleDatePeriod;
  dateFrom: string;
  dateTo: string;
};

export const MODULE_DATE_PRESETS: {
  id: ModuleDatePeriod;
  label: string;
  /** Libellé tab téléphone (1 ligne dense) */
  shortLabel: string;
}[] = [
  { id: 'day', label: "Aujourd'hui", shortLabel: 'Jour' },
  { id: 'week', label: '7 jours', shortLabel: '7j' },
  { id: 'month', label: 'Mois', shortLabel: 'Mois' },
  { id: 'year', label: 'Année', shortLabel: 'An' },
  { id: 'all', label: 'Tout', shortLabel: 'Tout' },
];

export const DEFAULT_DATE_FILTER: ModuleDateFilter = {
  period: 'all',
  dateFrom: '',
  dateTo: '',
};

const STORAGE_KEY = 'orion-module-date-filter-v2';

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function fmt(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Calcule la plage effective (preset ou dates personnalisées). */
export function resolveDateRange(filter: ModuleDateFilter): { from?: Date; to?: Date } {
  if (filter.dateFrom && filter.dateTo) {
    return { from: startOfDay(new Date(filter.dateFrom)), to: endOfDay(new Date(filter.dateTo)) };
  }
  if (filter.period === 'all') return {};

  const now = new Date();
  const to = endOfDay(now);

  if (filter.period === 'day') {
    return { from: startOfDay(now), to };
  }
  if (filter.period === 'week') {
    const from = startOfDay(now);
    from.setDate(from.getDate() - 6);
    return { from, to };
  }
  if (filter.period === 'month') {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to };
  }
  if (filter.period === 'year') {
    return { from: new Date(now.getFullYear(), 0, 1), to };
  }
  return {};
}

export function dateFilterQueryString(filter: ModuleDateFilter): string {
  const p = new URLSearchParams();
  p.set('period', filter.period);
  const { from, to } = resolveDateRange(filter);
  if (from) p.set('dateFrom', fmt(from));
  if (to) p.set('dateTo', fmt(to));
  return p.toString();
}

/** Période dashboard (sans year/all → fallback month pour KPI CA). */
export function dashboardPeriod(filter: ModuleDateFilter): 'day' | 'week' | 'month' {
  if (filter.period === 'day' || filter.period === 'week' || filter.period === 'month') {
    return filter.period;
  }
  return 'month';
}

export function loadStoredDateFilter(): ModuleDateFilter {
  if (typeof window === 'undefined') return DEFAULT_DATE_FILTER;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DATE_FILTER;
    const parsed = JSON.parse(raw) as ModuleDateFilter;
    return { ...DEFAULT_DATE_FILTER, ...parsed };
  } catch {
    return DEFAULT_DATE_FILTER;
  }
}

export function saveStoredDateFilter(filter: ModuleDateFilter) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filter));
}

/** Parse plage depuis query API (serveur).
 * - dateFrom + dateTo → plage custom
 * - period absent ou `all` → aucun filtre (liste complète)
 * - period day|week|month|year → preset
 * Ne jamais injecter `month` par défaut : ça vidait CRM / listes sur données seed.
 */
export function parseApiDateRange(searchParams: URLSearchParams) {
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  if (dateFrom && dateTo) {
    return {
      from: startOfDay(new Date(dateFrom)),
      to: endOfDay(new Date(dateTo)),
    };
  }
  const periodRaw = searchParams.get('period');
  if (!periodRaw || periodRaw === 'all') return {};
  return resolveDateRange({
    period: periodRaw as ModuleDatePeriod,
    dateFrom: '',
    dateTo: '',
  });
}
