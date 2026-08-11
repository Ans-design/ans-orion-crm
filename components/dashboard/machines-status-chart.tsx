'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Cpu, RefreshCw } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import type { MachineStatusData } from '@/lib/dashboard/chart-aggregations';
import { MACHINE_STATUS_COLORS, PRISMA_MACHINE_STATUS_MAP } from '@/lib/dashboard/chart-theme';
import {
  ChartEmpty,
  ChartError,
  ChartSkeleton,
} from '@/components/dashboard/chart-states';
import { ChartFrame, safeChartNumber } from '@/components/dashboard/chart-frame';
import '@/styles/cockpit-charts.css';

type Props = {
  data?: MachineStatusData[] | null;
  totalMachines?: number;
  loading?: boolean;
  error?: boolean;
  updatedAt?: string;
  onRefresh?: () => void;
};

type MachineRow = {
  status: string;
  label: string;
  count: number;
  percentage: number;
  machineNames: string[];
};

function prismaStatusFilter(semantic: string): string {
  const entry = Object.entries(PRISMA_MACHINE_STATUS_MAP).find(([, v]) => v === semantic);
  return entry?.[0] ?? semantic;
}

export function MachinesStatusChart({
  data,
  totalMachines,
  loading,
  error,
  updatedAt,
  onRefresh,
}: Props) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const rows = useMemo(() => {
    return (Array.isArray(data) ? data : [])
      .map((item) => ({
        status: String(item.status ?? 'unknown'),
        label: String(item.label ?? item.status ?? '—'),
        count: safeChartNumber(item.count),
        percentage: safeChartNumber(item.percentage),
        machineNames: Array.isArray(item.machineNames) ? item.machineNames : [],
      }))
      .filter((item) => item.count > 0);
  }, [data]);

  const total = safeChartNumber(totalMachines) || rows.reduce((s, r) => s + r.count, 0);
  const active: MachineRow | null =
    activeIndex != null && activeIndex >= 0 && activeIndex < rows.length
      ? rows[activeIndex]
      : null;

  if (loading) return <ChartSkeleton height={260} />;

  if (error) {
    return (
      <ChartError title="Impossible de charger l'état des machines" onRetry={onRefresh} />
    );
  }

  if (!rows.length || total === 0) {
    return (
      <ChartEmpty
        title="Aucune machine enregistrée"
        description="Ajoutez vos machines pour suivre leur état de production."
        icon={Cpu}
        minHeight={180}
      />
    );
  }

  const navigateToStatus = (semantic: string) => {
    const prismaStatus = prismaStatusFilter(semantic);
    router.push(`/machines?status=${encodeURIComponent(prismaStatus)}`);
  };

  const preview = active ? active.machineNames.slice(0, 6) : [];
  const extra = active ? active.machineNames.length - preview.length : 0;

  return (
    <div className="ck-charts ck-machines w-full min-w-0">
      <div className="toa__head mb-3" style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <div className="min-w-0">
          <h3 className="dashboard-chart-card-title" style={{ margin: 0 }}>
            Machines par état
          </h3>
          <p className="dashboard-chart-card-subtitle">Répartition actuelle du parc</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {updatedAt ? (
            <span className="text-[10px] text-[var(--ck-muted,#7c879c)] tabular-nums hidden sm:inline">
              {updatedAt}
            </span>
          ) : null}
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--ck-muted)] hover:text-[var(--ck-accent,#ff174d)]"
              title="Actualiser"
              aria-label="Actualiser"
            >
              <RefreshCw size={11} aria-hidden />
            </button>
          ) : null}
          <Link
            href="/machines"
            className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--ck-accent,#ff174d)] hover:underline"
          >
            Machines <ArrowUpRight size={11} aria-hidden />
          </Link>
        </div>
      </div>

      <div className="ck-donut">
        <div className="ck-donut__chart">
          <ChartFrame height={168}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={140} debounce={50}>
              <PieChart>
                <Pie
                  data={rows}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={68}
                  paddingAngle={3}
                  cornerRadius={4}
                  stroke="none"
                  isAnimationActive={rows.length < 20}
                  onMouseEnter={(_, i) => setActiveIndex(i)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onClick={(_, i) => navigateToStatus(rows[i]?.status ?? '')}
                  style={{ cursor: 'pointer' }}
                >
                  {rows.map((item, i) => (
                    <Cell
                      key={item.status}
                      fill={MACHINE_STATUS_COLORS[item.status] ?? '#94A3B8'}
                      stroke="none"
                      opacity={activeIndex === null || activeIndex === i ? 1 : 0.4}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </ChartFrame>
          <div className="ck-donut__center">
            <strong>{total}</strong>
            <span>machines</span>
          </div>
        </div>

        <div className="ck-machine-legend">
          {rows.map((item, i) => (
            <button
              key={item.status}
              type="button"
              onClick={() => navigateToStatus(item.status)}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
              className={activeIndex === i ? 'is-active' : undefined}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className="ck-donut__dot"
                  style={{ background: MACHINE_STATUS_COLORS[item.status] ?? '#94A3B8' }}
                  aria-hidden
                />
                <span className="ck-donut__label">{item.label}</span>
              </span>
              <span className="ck-donut__val">
                {item.count} · {item.percentage}%
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Zone bas : détail au survol (plus de tooltip flottant sur le donut) */}
      <div
        className={`ck-machine-detail ${active ? 'is-filled' : ''}`}
        aria-live="polite"
      >
        {active ? (
          <>
            <div className="ck-machine-detail__head">
              <span
                className="ck-donut__dot"
                style={{ background: MACHINE_STATUS_COLORS[active.status] ?? '#94A3B8' }}
                aria-hidden
              />
              <strong>{active.label}</strong>
              <span className="ck-machine-detail__meta">
                {active.count} machine{active.count > 1 ? 's' : ''} — {active.percentage}%
              </span>
            </div>
            {preview.length > 0 ? (
              <ul className="ck-machine-detail__list">
                {preview.map((name) => (
                  <li key={name}>{name}</li>
                ))}
                {extra > 0 ? (
                  <li className="ck-machine-detail__more">
                    + {extra} autre{extra > 1 ? 's' : ''}
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="ck-machine-detail__empty">Aucune machine listée pour cet état.</p>
            )}
          </>
        ) : (
          <p className="ck-machine-detail__hint">
            Survolez un secteur ou une ligne pour afficher les machines
          </p>
        )}
      </div>
    </div>
  );
}
