'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowLeft, Cpu, Users } from 'lucide-react';
import {
  AppPageHeader, AppListSkeleton, AppKpiCard, AppEmptyState, AppButton,
} from '@/components/ui/app-ui';
import { ANS } from '@/lib/ans-colors';
import type { PerformanceAnalyticsPayload } from '@/lib/services/performance-analytics-service';
import { useCanViewNamedTeamPerformance } from '@/hooks/use-can-view-margin';

const VerticalBarChart = dynamic(
  () => import('@/components/dashboard/chart-widgets').then((m) => m.VerticalBarChart),
  { ssr: false, loading: () => <div className="h-40 animate-pulse bg-accent/40 rounded-[7px]" aria-hidden /> },
);
const HorizontalRankChart = dynamic(
  () => import('@/components/dashboard/chart-widgets').then((m) => m.HorizontalRankChart),
  { ssr: false, loading: () => <div className="h-40 animate-pulse bg-accent/40 rounded-[7px]" aria-hidden /> },
);
const DonutStatusChart = dynamic(
  () => import('@/components/dashboard/chart-widgets').then((m) => m.DonutStatusChart),
  { ssr: false, loading: () => <div className="h-40 animate-pulse bg-accent/40 rounded-[7px]" aria-hidden /> },
);

type PerfPayload = PerformanceAnalyticsPayload & {
  canViewNamedTeamPerformance?: boolean;
};

export default function RapportsPerformancePage() {
  const canViewNamed = useCanViewNamedTeamPerformance();
  const [data, setData] = useState<PerfPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/rapports/performance');
      if (!r.ok) {
        setData(null);
        setError(r.status === 403 ? 'Accès refusé à la performance' : 'Impossible de charger les graphiques');
        return;
      }
      setData(await r.json());
    } catch {
      setData(null);
      setError('Délai dépassé — réessayez');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const showNamed =
    canViewNamed && data?.canViewNamedTeamPerformance !== false;

  return (
    <div className="space-y-6">
      <AppPageHeader
        title="Performance machines & équipes"
        description="Taux d'utilisation parc machine, charge planning atelier et scores RH"
        actions={
          <Link
            href="/rapports"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={14} /> Retour rapports
          </Link>
        }
      />

      {loading ? (
        <AppListSkeleton rows={4} />
      ) : error ? (
        <div className="space-y-3">
          <AppEmptyState
            icon={Cpu}
            title={error}
            description="Les indicateurs machines / équipes sont temporairement indisponibles."
          />
          <AppButton type="button" onClick={() => void load()}>Réessayer</AppButton>
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <AppKpiCard label="Machines suivies" value={data.machines.utilization.length} icon={Cpu} color={ANS.red} />
            <AppKpiCard label="Utilisation moy." value={data.machines.avgUtilization} icon={Cpu} color={ANS.red} hint="%" />
            <AppKpiCard label="Créneaux 30 j" value={data.machines.totalSlots} icon={Cpu} color="#10B981" />
            <AppKpiCard label="Effectif actif" value={data.employees.activeCount} icon={Users} color={ANS.red} />
          </div>

          <section className="space-y-3" aria-labelledby="perf-machines-title">
            <h2 id="perf-machines-title" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <Cpu size={16} /> Parc machines
            </h2>
            <div className="grid lg:grid-cols-2 gap-4">
              <ChartCard title="Taux d'utilisation (%)" subtitle="Par machine — données parc">
                <VerticalBarChart
                  data={data.machines.utilization}
                  emptyLabel="Aucune machine enregistrée"
                />
              </ChartCard>
              <ChartCard title="Charge planning (30 j)" subtitle="Créneaux atelier par machine">
                <HorizontalRankChart
                  data={data.machines.slotsByMachine}
                  emptyLabel="Aucun créneau sur la période"
                />
              </ChartCard>
              <ChartCard title="Répartition statuts" subtitle="Disponible, production, maintenance…">
                <DonutStatusChart
                  data={data.machines.statusBreakdown}
                  emptyLabel="Parc machine vide"
                />
              </ChartCard>
            </div>
          </section>

          <section className="space-y-3" aria-labelledby="perf-employees-title">
            <h2 id="perf-employees-title" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <Users size={16} /> Performance employés
            </h2>
            <div className="grid lg:grid-cols-2 gap-4">
              {showNamed ? (
                <ChartCard
                  title="Scores individuels"
                  subtitle={`Moyenne équipe : ${data.employees.avgScore} pts`}
                >
                  <HorizontalRankChart
                    data={data.employees.scores}
                    emptyLabel="Aucune évaluation enregistrée — module RH Performance"
                  />
                </ChartCard>
              ) : (
                <ChartCard
                  title="Scores individuels"
                  subtitle="Réservé direction / RH — vue anonymisée"
                >
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Moyenne équipe : <strong>{data.employees.avgScore}</strong> pts
                    {' · '}{data.employees.activeCount} actifs
                  </p>
                </ChartCard>
              )}
              <ChartCard title="Moyenne par département" subtitle="Ponctualité + qualité + consignes">
                <VerticalBarChart
                  data={data.employees.byDepartment}
                  emptyLabel="Aucun employé actif"
                />
              </ChartCard>
              {showNamed ? (
                <ChartCard title="Top performers" subtitle="Classement période courante">
                  <HorizontalRankChart
                    data={data.employees.topPerformers}
                    emptyLabel="Leaderboard vide"
                  />
                </ChartCard>
              ) : null}
            </div>
          </section>

          <p className="text-xs text-muted-foreground">
            Dernière mise à jour : {new Date(data.generatedAt).toLocaleString('fr-FR')}
            {showNamed ? (
              <>
                {' · '}
                <Link href="/rh/performance" className="text-[var(--ans-cyan)] hover:underline">
                  Gérer les évaluations RH
                </Link>
              </>
            ) : null}
          </p>
        </>
      ) : (
        <AppEmptyState
          icon={Cpu}
          title="Aucune donnée de performance"
          description="Enregistrez des machines et évaluations RH pour alimenter cette vue."
        />
      )}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-[7px] p-4 min-h-[280px]">
      <h3 className="font-semibold text-sm">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground mb-3">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </div>
  );
}
