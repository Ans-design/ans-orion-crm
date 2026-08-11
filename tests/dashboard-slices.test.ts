import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  clearDashboardSliceCache,
  getDashboardSummary,
  getDashboardSalesSlice,
  loadDashboardFullStats,
} from '@/lib/services/dashboard-slices';
import { getDashboardStats } from '@/lib/services/dashboard-stats';

vi.mock('@/lib/services/dashboard-stats', () => ({
  getDashboardStats: vi.fn(),
}));

const mockStats = {
  period: 'week',
  kpis: { caDay: 100, stockCritique: 2 },
  alertes: [],
  recentCmds: [],
  recentPaiements: [],
  livraisonsPrevues: [],
  recentAudit: [],
  kpiDrawerHints: {},
  recentAnnonces: [],
  devisEnAttenteList: [],
  rhPointage: { presentsToday: 5, retardsToday: 1 },
  chartsPeriodLabel: '7 jours',
  caChart: [{ label: 'Lun', value: 10 }],
  topClients: [],
  topArticles: [],
  caByCommercial: [],
  clientsByVille: [],
  caByVille: [],
  caByCanal: [],
  caByCanalDecouverte: [],
  inactiveClients: [],
  commandesByStatut: [],
  devisByStatut: [],
  commandePeakHours: [],
  topVillesClients: [],
  chartsUpdatedAt: '2026-07-04T00:00:00.000Z',
  machinesStatus: [],
  totalMachines: 0,
  machinesChart: [],
  caVsDepenses: [],
  chartsHasEstimatedData: false,
  chargesByCategory: [],
  impayesParClient: [],
  livraisonsByStatut: [],
};

describe('dashboard-slices cache', () => {
  beforeEach(() => {
    clearDashboardSliceCache();
    vi.mocked(getDashboardStats).mockReset();
    vi.mocked(getDashboardStats).mockResolvedValue(mockStats as never);
  });

  it('réutilise getDashboardStats pour slices parallèles', async () => {
    await Promise.all([
      getDashboardSummary('week'),
      getDashboardSalesSlice('week'),
    ]);
    expect(getDashboardStats).toHaveBeenCalledTimes(1);
  });

  it('loadDashboardFullStats retourne les KPI DB', async () => {
    const full = await loadDashboardFullStats('week');
    expect(full.kpis.caDay).toBe(100);
    expect(full.chartsHasEstimatedData).toBe(false);
  });
});
