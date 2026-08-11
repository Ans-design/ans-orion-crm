import { clearDashboardSliceCache } from '@/lib/services/dashboard-slices';

/** Invalide le cache KPI dashboard/cockpit après une mutation métier. */
export function invalidateKpiCaches(): void {
  clearDashboardSliceCache();
}
