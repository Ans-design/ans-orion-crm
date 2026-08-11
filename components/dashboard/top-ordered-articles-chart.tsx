'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatPrice } from '@/lib/data/catalogue';
import type { TopArticleData } from '@/lib/dashboard/chart-aggregations';
import { CHART_COLORS, formatChartAxisAmount } from '@/lib/dashboard/chart-theme';
import {
  ChartEmpty,
  ChartError,
  ChartSkeleton,
  ChartCardFooter,
} from '@/components/dashboard/chart-states';
import { ChartFrame, safeChartNumber, CHART_TOOLTIP_STYLE } from '@/components/dashboard/chart-frame';

type SortMode = 'quantity' | 'revenue';

type Props = {
  data?: TopArticleData[] | null;
  loading?: boolean;
  error?: boolean;
  periodLabel?: string;
  updatedAt?: string;
  onRefresh?: () => void;
};

function TopArticleTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: TopArticleData }[];
}) {
  if (!active || !payload?.[0]?.payload) return null;
  const d = payload[0].payload;
  return (
    <div style={CHART_TOOLTIP_STYLE}>
      <p className="font-semibold text-[var(--text-primary)] mb-1.5">{d.articleName}</p>
      <p className="text-[var(--text-secondary)]">
        Quantité : <strong className="text-[var(--text-primary)]">{safeChartNumber(d.quantity).toLocaleString('fr-FR')}</strong>
      </p>
      <p className="text-[var(--text-secondary)]">
        CA : <strong className="text-[var(--text-primary)]">{formatPrice(safeChartNumber(d.revenue))}</strong>
      </p>
      <p className="text-[var(--text-secondary)]">
        Commandes : <strong className="text-[var(--text-primary)]">{safeChartNumber(d.ordersCount)}</strong>
      </p>
      <p className="text-[var(--text-secondary)]">
        Catégorie : <strong className="text-[var(--text-primary)]">{d.category}</strong>
      </p>
    </div>
  );
}

export function TopOrderedArticlesChart({
  data,
  loading,
  error,
  periodLabel = 'Période sélectionnée',
  updatedAt,
  onRefresh,
}: Props) {
  const router = useRouter();
  const [sortBy, setSortBy] = useState<SortMode>('quantity');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const sorted = useMemo(() => {
    const copy = (Array.isArray(data) ? data : []).map((row) => ({
      ...row,
      articleId: String(row.articleId ?? row.articleName ?? 'article'),
      articleName: String(row.articleName ?? 'Article'),
      shortName: String(row.shortName ?? row.articleName ?? 'Article'),
      category: String(row.category ?? 'Autre'),
      quantity: safeChartNumber(row.quantity),
      revenue: safeChartNumber(row.revenue),
      ordersCount: safeChartNumber(row.ordersCount),
    }));
    copy.sort((a, b) =>
      sortBy === 'revenue' ? b.revenue - a.revenue : b.quantity - a.quantity,
    );
    return copy;
  }, [data, sortBy]);

  const dataKey = sortBy === 'revenue' ? 'revenue' : 'quantity';
  const chartHeight = Math.max(240, sorted.length * 36 + 40);

  if (loading) return <ChartSkeleton height={300} />;

  if (error) {
    return (
      <ChartError
        title="Impossible de charger les articles commandés"
        onRetry={onRefresh}
      />
    );
  }

  if (!sorted.length) {
    return (
      <ChartEmpty
        title="Aucun article commandé"
        description="Les articles les plus commandés apparaîtront ici dès qu'une commande sera validée."
      />
    );
  }

  return (
    <div className="w-full min-w-0">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold text-sm text-[var(--text-primary)]">
            Top articles commandés
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {sorted.length} meilleurs articles — {periodLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-[7px] border border-[var(--border-soft)] overflow-hidden text-[10px] font-semibold">
            <button
              type="button"
              onClick={() => setSortBy('quantity')}
              className={`px-2.5 py-1 transition-colors ${
                sortBy === 'quantity'
                  ? 'bg-[var(--brand-primary)] text-white'
                  : 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]'
              }`}
            >
              Par quantité
            </button>
            <button
              type="button"
              onClick={() => setSortBy('revenue')}
              className={`px-2.5 py-1 transition-colors ${
                sortBy === 'revenue'
                  ? 'bg-[var(--brand-primary)] text-white'
                  : 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]'
              }`}
            >
              Par CA
            </button>
          </div>
          <Link
            href="/commandes"
            className="text-[10px] font-semibold text-[var(--brand-primary)] hover:underline whitespace-nowrap"
          >
            Voir détail
          </Link>
        </div>
      </div>

      <ChartFrame height={chartHeight}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200} debounce={50}>
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
            onMouseLeave={() => setHoverIndex(null)}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border-subtle)"
              horizontal={false}
              opacity={0.5}
            />
            <XAxis
              type="number"
              tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
              axisLine={{ stroke: 'var(--border-soft)' }}
              tickFormatter={(v) =>
                sortBy === 'revenue' ? formatChartAxisAmount(v) : String(v)
              }
            />
            <YAxis
              type="category"
              dataKey="shortName"
              width={150}
              tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<TopArticleTooltip />} cursor={{ fill: 'var(--border-subtle)', opacity: 0.35 }} />
            <Bar
              dataKey={dataKey}
              radius={[0, 8, 8, 0]}
              maxBarSize={22}
              isAnimationActive={sorted.length < 30}
              onMouseEnter={(_, index) => setHoverIndex(index)}
            >
              {sorted.map((entry, i) => (
                <Cell
                  key={`${entry.articleId}-${i}`}
                  fill={
                    hoverIndex === i ? CHART_COLORS.primaryHover : CHART_COLORS.primary
                  }
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    router.push(`/commandes?search=${encodeURIComponent(entry.articleName)}`);
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartCardFooter updatedAt={updatedAt} onRefresh={onRefresh} />
    </div>
  );
}
