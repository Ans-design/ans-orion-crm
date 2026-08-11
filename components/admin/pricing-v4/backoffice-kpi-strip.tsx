'use client';

import type { PricingOverviewStats } from '@/lib/pricing/pricing-types';

type Props = {
  stats: PricingOverviewStats | null;
  loading?: boolean;
  anomalyCount?: number;
  publishedCount?: number;
};

export function BackofficeKpiStrip({ stats, loading, anomalyCount, publishedCount }: Props) {
  if (loading && !stats) {
    return (
      <div className="pta-kpi-strip" aria-busy="true" aria-label="Indicateurs backoffice">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="pta-kpi-cell pta-skeleton" style={{ height: 52 }} />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const anomalies = anomalyCount ?? (stats.anomaliesCritical + stats.anomaliesWarning);
  const published = publishedCount ?? stats.publishedProfiles;

  const cells = [
    { label: 'Articles catalogue', value: stats.catalogueArticles },
    { label: 'Profils publiés', value: published, ok: published > 0 },
    { label: 'Brouillons', value: stats.draftProfiles, warn: stats.draftProfiles > 0 },
    { label: 'Sans profil', value: stats.withoutProfile, danger: stats.withoutProfile > 0 },
    { label: 'Anomalies', value: anomalies, danger: anomalies > 0 },
    { label: 'PRIX 2026 actifs', value: stats.salePrices2026Active },
  ];

  return (
    <div className="pta-kpi-strip" role="region" aria-label="Indicateurs administration">
      {cells.map((c) => (
        <div
          key={c.label}
          className={`pta-kpi-cell${c.danger ? ' is-danger' : ''}${c.warn ? ' is-warn' : ''}${c.ok ? ' is-ok' : ''}`}
        >
          <p className="pta-kpi-value">{c.value}</p>
          <p className="pta-kpi-label">{c.label}</p>
        </div>
      ))}
    </div>
  );
}
