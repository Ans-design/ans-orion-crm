'use client';

/**
 * Grille analyses cockpit — un seul module (évite N dynamic() redondants page dashboard).
 */

import CaChart from '@/components/dashboard/ca-chart';
import {
  ChartCard,
  DonutStatusChart,
  DualBarChart,
  CaForecastChart,
  HorizontalRankChart,
} from '@/components/dashboard/chart-widgets';
import { TopOrderedArticlesChart } from '@/components/dashboard/top-ordered-articles-chart';
import { MachinesStatusChart } from '@/components/dashboard/machines-status-chart';
import type { TopArticleData, MachineStatusData } from '@/lib/dashboard/chart-aggregations';
import '@/styles/cockpit-charts.css';

export type DashboardChartsPayload = {
  caChart?: { label: string; value: number }[] | null;
  caVsDepenses?: { name: string; ca: number; depenses: number }[] | null;
  caForecast?: { label: string; value: number; projected?: boolean }[] | null;
  caForecastSummary?: { nextMonthLabel: string; projectedCa: number; trendPct: number | null } | null;
  chartsHasEstimatedData?: boolean;
  commandesByStatut?: { name: string; value: number }[] | null;
  devisByStatut?: { name: string; value: number }[] | null;
  livraisonsByStatut?: { name: string; value: number }[] | null;
  chargesByCategory?: { name: string; value: number }[] | null;
  topClients?: { id: string; name: string; code: string; ca: number }[] | null;
  caByCommercial?: { name: string; value: number }[] | null;
  clientsByVille?: { name: string; value: number }[] | null;
  caByVille?: { name: string; value: number }[] | null;
  caByCanal?: { name: string; value: number }[] | null;
  caByCanalDecouverte?: { name: string; value: number }[] | null;
  topArticles?: TopArticleData[] | null;
  machinesStatus?: MachineStatusData[] | null;
  totalMachines?: number;
  chartsUpdatedAt?: string;
  chartsPeriodLabel?: string;
};

type Props = {
  data: DashboardChartsPayload;
  chartsLoading?: boolean;
  chartsError?: boolean;
  onRefresh?: () => void;
};

export function DashboardChartsGrid({ data, chartsLoading, chartsError, onRefresh }: Props) {
  const topClients = Array.isArray(data.topClients) ? data.topClients : [];
  const forecastSub = data.caForecastSummary
    ? `${data.caForecastSummary.nextMonthLabel} — ${Number(data.caForecastSummary.projectedCa || 0).toLocaleString('fr-FR')} Ar${
        data.caForecastSummary.trendPct != null
          ? ` · tendance ${data.caForecastSummary.trendPct >= 0 ? '+' : ''}${data.caForecastSummary.trendPct}%`
          : ''
      }`
    : 'Moyenne mobile 3 mois';

  return (
    <div className="dashboard-grid ck-charts">
      <ChartCard title="CA — 7 derniers jours" subtitle="Encaissements" span={6}>
        <CaChart data={data.caChart ?? []} />
      </ChartCard>
      <ChartCard
        title="CA vs Dépenses"
        subtitle={
          data.chartsHasEstimatedData
            ? '6 derniers mois — dépenses passées estimées (données démo)'
            : '6 derniers mois — données réelles'
        }
        span={6}
      >
        <DualBarChart data={data.caVsDepenses ?? []} />
      </ChartCard>
      <ChartCard title="Projection CA" subtitle={forecastSub} span={6}>
        <CaForecastChart data={data.caForecast ?? []} />
      </ChartCard>
      <ChartCard title="Dépenses par catégorie" span={6}>
        <HorizontalRankChart data={data.chargesByCategory ?? []} formatPriceValues />
      </ChartCard>
      <ChartCard title="Commandes par statut" span={4}>
        <DonutStatusChart data={data.commandesByStatut ?? []} emptyLabel="Aucune commande" />
      </ChartCard>
      <ChartCard title="Devis par statut" span={4}>
        <DonutStatusChart data={data.devisByStatut ?? []} emptyLabel="Aucun devis" />
      </ChartCard>
      <ChartCard title="Livraisons" span={4}>
        <DonutStatusChart data={data.livraisonsByStatut ?? []} emptyLabel="Aucune livraison" />
      </ChartCard>
      {/* Rang CRM / géo / canaux — 2 lignes × 3 colonnes identiques */}
      <ChartCard title="Top clients (mois)" span={4}>
        <HorizontalRankChart
          data={topClients.map((c) => ({ name: c.name, value: Number(c.ca) || 0 }))}
          formatPriceValues
        />
      </ChartCard>
      <ChartCard title="CA par commercial" subtitle="Commandes du mois" span={4}>
        <HorizontalRankChart data={data.caByCommercial ?? []} formatPriceValues />
      </ChartCard>
      <ChartCard title="Clients par ville" subtitle="Répartition géographique" span={4}>
        <HorizontalRankChart data={data.clientsByVille ?? []} />
      </ChartCard>
      <ChartCard title="CA par ville" span={4}>
        <HorizontalRankChart data={data.caByVille ?? []} formatPriceValues />
      </ChartCard>
      <ChartCard title="CA par canal vente" span={4}>
        <HorizontalRankChart data={data.caByCanal ?? []} formatPriceValues />
      </ChartCard>
      <ChartCard title="CA par canal découverte" span={4}>
        <HorizontalRankChart data={data.caByCanalDecouverte ?? []} formatPriceValues />
      </ChartCard>
      <div className="dashboard-chart-card ck-charts card-span-6 min-w-0">
        <TopOrderedArticlesChart
          data={data.topArticles ?? []}
          loading={chartsLoading}
          error={chartsError}
          periodLabel={data.chartsPeriodLabel}
          updatedAt={data.chartsUpdatedAt}
          onRefresh={onRefresh}
        />
      </div>
      <div className="dashboard-chart-card ck-charts card-span-6 min-w-0">
        <MachinesStatusChart
          data={data.machinesStatus ?? []}
          totalMachines={data.totalMachines ?? 0}
          loading={chartsLoading}
          error={chartsError}
          updatedAt={data.chartsUpdatedAt}
          onRefresh={onRefresh}
        />
      </div>
    </div>
  );
}
