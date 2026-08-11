'use client';

import { useId, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  CartesianGrid,
} from 'recharts';
import { formatPrice } from '@/lib/format/french-typography';
import {
  CHART_SERIES,
  CHART_CA,
  CHART_DEPENSES,
  CHART_BENEFICE,
  CHART_PROJECTED,
  formatChartAxisAmount,
} from '@/lib/dashboard/chart-theme';
import { ChartFrame, safeChartNumber, CHART_TOOLTIP_STYLE } from '@/components/dashboard/chart-frame';
import { ChartEmpty } from '@/components/dashboard/chart-states';
import '@/styles/cockpit-charts.css';

type Point = { name: string; value: number; color?: string };

const axisTick = { fontSize: 10, fill: 'var(--ck-muted, var(--text-muted))', fontWeight: 600 };
const axisLine = { stroke: 'var(--ck-line, var(--border-soft))' };
const gridStroke = 'var(--ck-line, var(--border-subtle))';

function seriesColor(entry: Point, index: number): string {
  return entry.color ?? CHART_SERIES[index % CHART_SERIES.length];
}

function normalizePoints(data?: Point[] | null): Point[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((d) => d != null && (d.name != null || d.value != null))
    .map((d) => ({
      name: String(d.name ?? '—').trim() || '—',
      value: safeChartNumber(d.value),
      color: d.color,
    }));
}

const tooltipStyle = {
  ...CHART_TOOLTIP_STYLE,
  borderRadius: 10,
  border: '1px solid var(--ck-line, var(--border-soft))',
  boxShadow: '0 10px 28px rgba(31, 42, 71, 0.12)',
  padding: '10px 12px',
  fontSize: 11,
};

export function DonutStatusChart({
  data,
  emptyLabel = 'Aucune donnée',
}: {
  data?: Point[] | null;
  emptyLabel?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const filtered = useMemo(
    () => normalizePoints(data).filter((d) => d.value > 0),
    [data],
  );
  const total = filtered.reduce((s, d) => s + d.value, 0);

  if (!filtered.length) {
    return (
      <ChartEmpty
        label={emptyLabel}
        description="Les données apparaîtront dès qu'une activité sera enregistrée."
        minHeight={160}
      />
    );
  }

  return (
    <div className="ck-donut ck-charts">
      <div className="ck-donut__chart">
        <ChartFrame height={168}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={140} debounce={50}>
            <PieChart>
              <Pie
                data={filtered}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={68}
                paddingAngle={3}
                cornerRadius={4}
                stroke="none"
                isAnimationActive={filtered.length < 40}
                onMouseEnter={(_, i) => setActive(i)}
                onMouseLeave={() => setActive(null)}
              >
                {filtered.map((entry, i) => (
                  <Cell
                    key={`${entry.name}-${i}`}
                    fill={seriesColor(entry, i)}
                    stroke="none"
                    opacity={active === null || active === i ? 1 : 0.4}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number) => safeChartNumber(v).toLocaleString('fr-FR')}
                contentStyle={tooltipStyle}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartFrame>
        <div className="ck-donut__center">
          <strong>{total.toLocaleString('fr-FR')}</strong>
          <span>total</span>
        </div>
      </div>
      <ul className="ck-donut__legend">
        {filtered.map((entry, i) => {
          const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
          return (
            <li
              key={`${entry.name}-${i}`}
              className="ck-donut__item"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              <span
                className="ck-donut__dot"
                style={{ background: seriesColor(entry, i) }}
                aria-hidden
              />
              <span className="ck-donut__label">{entry.name}</span>
              <span className="ck-donut__val">
                {entry.value.toLocaleString('fr-FR')} · {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function VerticalBarChart({
  data,
  formatPriceValues = false,
  emptyLabel = 'Aucune donnée',
}: {
  data?: Point[] | null;
  formatPriceValues?: boolean;
  emptyLabel?: string;
}) {
  const gid = useId().replace(/:/g, '');
  const rows = normalizePoints(data);
  if (!rows.length || rows.every((d) => d.value === 0)) {
    return (
      <ChartEmpty
        label={emptyLabel}
        description="Aucun volume sur la période sélectionnée."
        minHeight={160}
      />
    );
  }

  return (
    <div className="ck-charts">
      <ChartFrame height={210}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={170} debounce={50}>
          <BarChart data={rows} margin={{ top: 10, right: 6, left: -6, bottom: 4 }} barCategoryGap="18%">
            <defs>
              {rows.map((entry, i) => {
                const c = seriesColor(entry, i);
                return (
                  <linearGradient key={`${gid}-${i}`} id={`${gid}-g${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={c} stopOpacity={1} />
                    <stop offset="100%" stopColor={c} stopOpacity={0.55} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid strokeDasharray="4 6" stroke={gridStroke} vertical={false} opacity={0.7} />
            <XAxis
              dataKey="name"
              tick={axisTick}
              interval={0}
              angle={rows.length > 5 ? -18 : 0}
              textAnchor={rows.length > 5 ? 'end' : 'middle'}
              height={rows.length > 5 ? 44 : 28}
              axisLine={axisLine}
              tickLine={false}
            />
            <YAxis
              tick={axisTick}
              tickFormatter={(v) => (formatPriceValues ? formatChartAxisAmount(v) : String(v))}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              width={40}
            />
            <Tooltip
              formatter={(v: number) =>
                formatPriceValues
                  ? formatPrice(safeChartNumber(v))
                  : safeChartNumber(v).toLocaleString('fr-FR')
              }
              contentStyle={tooltipStyle}
              cursor={{ fill: 'var(--ck-soft, var(--border-subtle))', opacity: 0.55 }}
            />
            <Bar dataKey="value" radius={[7, 7, 3, 3]} maxBarSize={42} isAnimationActive={rows.length < 40}>
              {rows.map((entry, i) => (
                <Cell key={`${entry.name}-${i}`} fill={`url(#${gid}-g${i})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  );
}

export function HorizontalRankChart({
  data,
  formatPriceValues = false,
  emptyLabel = 'Aucune donnée',
}: {
  data?: Point[] | null;
  formatPriceValues?: boolean;
  emptyLabel?: string;
}) {
  const sorted = normalizePoints(data)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  const max = Math.max(...sorted.map((d) => d.value), 1);

  if (!sorted.length || sorted.every((d) => d.value === 0)) {
    return (
      <ChartEmpty
        label={emptyLabel}
        description="Les classements s'afficheront avec les premières données."
        minHeight={140}
      />
    );
  }

  return (
    <ol className="ck-rank ck-charts">
      {sorted.map((d, i) => {
        const rankClass = i === 0 ? 'is-1' : i === 1 ? 'is-2' : i === 2 ? 'is-3' : '';
        const pct = Math.max(4, Math.round((d.value / max) * 100));
        return (
          <li key={`${d.name}-${i}`} className="ck-rank__row">
            <span className={`ck-rank__idx ${rankClass}`} aria-hidden>
              {i + 1}
            </span>
            <div className="ck-rank__main">
              <div className="ck-rank__top">
                <span className="ck-rank__name">{d.name}</span>
                <span className="ck-rank__value">
                  {formatPriceValues ? formatPrice(d.value) : d.value.toLocaleString('fr-FR')}
                </span>
              </div>
              <div className="ck-rank__track" aria-hidden>
                <span
                  className="ck-rank__fill"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${seriesColor(d, i)}, ${seriesColor(d, i)}cc)`,
                  }}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Projection CA → délégation VerticalBarChart (un seul empty-state). */
export function CaForecastChart({
  data,
  emptyLabel = 'Projection indisponible',
}: {
  data?: { label: string; value: number; projected?: boolean }[] | null;
  emptyLabel?: string;
}) {
  const rows = (Array.isArray(data) ? data : []).map((p) => ({
    name: String(p?.label ?? '—'),
    value: safeChartNumber(p?.value),
    color: p?.projected ? CHART_PROJECTED : CHART_CA,
  }));
  return <VerticalBarChart data={rows} formatPriceValues emptyLabel={emptyLabel} />;
}

export function DualBarChart({
  data,
  emptyLabel = 'Aucune donnée',
}: {
  data?: { name: string; ca: number; depenses: number }[] | null;
  emptyLabel?: string;
}) {
  const gid = useId().replace(/:/g, '');
  const rows = (Array.isArray(data) ? data : []).map((d) => ({
    name: String(d?.name ?? '—'),
    ca: safeChartNumber(d?.ca),
    depenses: safeChartNumber(d?.depenses),
  }));
  if (!rows.length || rows.every((d) => d.ca === 0 && d.depenses === 0)) {
    return (
      <ChartEmpty
        label={emptyLabel}
        description="Comparatif CA / dépenses sur 6 mois."
        minHeight={160}
      />
    );
  }

  return (
    <div className="ck-charts">
      <ChartFrame height={210}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={170} debounce={50}>
          <BarChart data={rows} margin={{ top: 10, right: 6, left: -6, bottom: 0 }} barGap={4} barCategoryGap="22%">
            <defs>
              <linearGradient id={`${gid}-ca`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_CA} stopOpacity={1} />
                <stop offset="100%" stopColor={CHART_CA} stopOpacity={0.55} />
              </linearGradient>
              <linearGradient id={`${gid}-dep`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_DEPENSES} stopOpacity={1} />
                <stop offset="100%" stopColor={CHART_DEPENSES} stopOpacity={0.55} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 6" stroke={gridStroke} vertical={false} opacity={0.7} />
            <XAxis dataKey="name" tick={axisTick} axisLine={axisLine} tickLine={false} />
            <YAxis
              tick={axisTick}
              tickFormatter={formatChartAxisAmount}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              formatter={(v: number) => formatPrice(safeChartNumber(v))}
              contentStyle={tooltipStyle}
              cursor={{ fill: 'var(--ck-soft, var(--border-subtle))', opacity: 0.55 }}
            />
            <Legend
              wrapperStyle={{ fontSize: 10, fontWeight: 700, color: 'var(--ck-muted, var(--text-secondary))' }}
              iconType="circle"
              iconSize={8}
            />
            <Bar
              dataKey="ca"
              name="CA"
              fill={`url(#${gid}-ca)`}
              radius={[6, 6, 2, 2]}
              maxBarSize={28}
              isAnimationActive={rows.length < 24}
            />
            <Bar
              dataKey="depenses"
              name="Dépenses"
              fill={`url(#${gid}-dep)`}
              radius={[6, 6, 2, 2]}
              maxBarSize={28}
              isAnimationActive={rows.length < 24}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  );
}

export function ChartCard({
  title,
  subtitle,
  children,
  action,
  className = '',
  span,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  /** Span grille dashboard seulement — omettre hors `.dashboard-grid`. */
  span?: 3 | 4 | 6 | 8 | 12;
}) {
  const spanClass = span != null ? `card-span-${span}` : '';
  return (
    <div className={`dashboard-chart-card ck-charts ${spanClass} ${className}`.trim()}>
      <div className="dashboard-chart-card-header">
        <div className="min-w-0">
          <h3 className="dashboard-chart-card-title">{title}</h3>
          {subtitle && <p className="dashboard-chart-card-subtitle">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="dashboard-chart-card-body min-w-0">{children}</div>
    </div>
  );
}

export { CHART_CA, CHART_DEPENSES, CHART_BENEFICE };
