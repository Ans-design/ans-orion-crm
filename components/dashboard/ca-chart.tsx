'use client';

import { TrendingUp } from 'lucide-react';
import { formatPrice } from '@/lib/format/french-typography';
import { formatChartAxisAmount } from '@/lib/dashboard/chart-theme';
import { safeChartNumber } from '@/components/dashboard/chart-frame';
import { ChartEmpty } from '@/components/dashboard/chart-states';
import '@/styles/cockpit-charts.css';

type CaPoint = { label: string; value: number };

export default function CaChart({ data }: { data?: CaPoint[] | null }) {
  const rows = (Array.isArray(data) ? data : []).map((d) => ({
    label: String(d?.label ?? '—'),
    value: safeChartNumber(d?.value),
  }));
  const max = Math.max(...rows.map((d) => d.value), 1);
  const total = rows.reduce((s, d) => s + d.value, 0);
  const hasSales = rows.length > 0 && total > 0;

  if (!hasSales) {
    return (
      <ChartEmpty
        title="Aucune vente sur la période sélectionnée"
        description="Les encaissements apparaîtront ici dès le premier paiement."
        minHeight={180}
        icon={TrendingUp}
      />
    );
  }

  return (
    <div className="ck-ca ck-charts" role="img" aria-label="CA sur 7 jours">
      {rows.map((d) => {
        const h = d.value > 0 ? Math.max(8, (d.value / max) * 100) : 4;
        return (
          <div key={d.label} className="ck-ca__col">
            <div className="ck-ca__plot">
              <span className="ck-ca__tip">{formatPrice(d.value)}</span>
              <div
                className={`ck-ca__bar${d.value <= 0 ? ' is-empty' : ''}`}
                style={{ height: `${h}%` }}
                title={`${d.label}: ${formatPrice(d.value)}`}
              />
            </div>
            <span className="ck-ca__label">{d.label}</span>
            <span className="ck-ca__label" style={{ fontFamily: 'var(--ck-mono)', opacity: 0.85 }}>
              {d.value > 0 ? formatChartAxisAmount(d.value) : '—'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
