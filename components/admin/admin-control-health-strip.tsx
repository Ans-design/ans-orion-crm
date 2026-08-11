'use client';

import { AlertTriangle } from 'lucide-react';
import { AlertCard, MetricCell, MetricGrid } from '@/components/ui/section-layout';
import { adminStatusLabel } from '@/lib/administration/admin-ui-vocab';

type HealthKpis = {
  articlesActive?: number;
  articlesTotal?: number;
  chipsActive?: number;
  chipsDisabledVisible?: number;
  anomalies?: number;
  configStatus?: string;
  latestVersion?: number;
  pendingChanges?: {
    articlesChanged?: number;
    chipsChanged?: number;
    variablesChanged?: number;
    featuresChanged?: number;
  };
};

type FusionStatus = {
  ok?: boolean;
  fusion?: {
    materials: number;
    salePrices: number;
    salePricesAuto: number;
  };
};

export function AdminControlHealthStrip({
  health,
  fusionStatus,
}: {
  health: HealthKpis;
  fusionStatus?: FusionStatus | null;
}) {
  const items: { label: string; value: string | number; tone?: 'default' | 'ok' | 'warn' | 'danger' | 'brand' | 'gold' }[] = [
    { label: 'Articles actifs', value: `${health.articlesActive}/${health.articlesTotal}`, tone: 'ok' },
    { label: 'Chips actives', value: health.chipsActive ?? 0, tone: 'brand' },
    { label: 'Inactives visibles', value: health.chipsDisabledVisible ?? 0, tone: 'warn' },
    { label: 'Anomalies config', value: health.anomalies ?? 0, tone: (health.anomalies ?? 0) > 0 ? 'danger' : 'ok' },
    {
      label: 'Statut',
      value: adminStatusLabel(health.configStatus ?? 'published'),
      tone: health.configStatus === 'draft' ? 'warn' : 'ok',
    },
    { label: 'Version', value: `v${health.latestVersion}`, tone: 'default' },
    ...(fusionStatus?.ok && fusionStatus.fusion
      ? [
          { label: 'Matières DB', value: fusionStatus.fusion.materials, tone: 'brand' as const },
          {
            label: 'Archive PRIX 2026',
            value: `${fusionStatus.fusion.salePricesAuto}/${fusionStatus.fusion.salePrices}`,
            tone: 'ok' as const,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-3 mb-4">
      <MetricGrid columns={6}>
        {items.map((k) => (
          <MetricCell key={k.label} label={k.label} value={k.value} tone={k.tone} />
        ))}
      </MetricGrid>

      {health.configStatus === 'draft' && health.pendingChanges && (
        <AlertCard
          tone="warning"
          icon={AlertTriangle}
          title="Modifications non publiées"
          description={`${health.pendingChanges.articlesChanged} articles · ${health.pendingChanges.chipsChanged} chips · ${health.pendingChanges.variablesChanged} variables · ${health.pendingChanges.featuresChanged} fonctions`}
        />
      )}
    </div>
  );
}
