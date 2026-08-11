'use client';

import { cn } from '@/lib/utils';
import type { KpiStatus } from '@/lib/kpi/envelope';

const STATUS_LABEL: Record<KpiStatus, string> = {
  FRESH: 'À jour',
  STALE: 'Ancien',
  PARTIAL: 'Partiel',
  NO_DATA: 'Pas de données',
  NOT_APPLICABLE: 'N/A',
  FORBIDDEN: 'Non autorisé',
  ERROR: 'Erreur',
  PENDING_SYNC: 'Sync…',
};

/**
 * Affiche une valeur KPI sans transformer null/ERROR en zéro vert.
 */
export function KpiValue({
  value,
  status,
  unit,
  className,
  emptyLabel = '—',
}: {
  value: number | null | undefined;
  status: KpiStatus;
  unit?: string;
  className?: string;
  emptyLabel?: string;
}) {
  const isBad = status === 'ERROR' || status === 'FORBIDDEN' || status === 'NO_DATA' || status === 'NOT_APPLICABLE';
  const showZero = status === 'FRESH' && value === 0;
  const text =
    isBad || value == null
      ? emptyLabel
      : showZero || typeof value === 'number'
        ? new Intl.NumberFormat('fr-FR').format(value)
        : emptyLabel;

  return (
    <span
      className={cn(
        'tabular-nums',
        status === 'PARTIAL' && 'text-[var(--warning-text)]',
        status === 'ERROR' && 'text-[var(--danger-text)]',
        status === 'STALE' && 'opacity-70',
        status === 'FORBIDDEN' && 'text-muted-foreground',
        className,
      )}
      data-kpi-status={status}
      title={STATUS_LABEL[status]}
    >
      {text}
      {unit && !isBad && value != null ? <span className="ml-1 text-xs opacity-70">{unit}</span> : null}
    </span>
  );
}

export function KpiStatusBadge({ status }: { status: KpiStatus }) {
  const tone =
    status === 'FRESH'
      ? 'border-[color-mix(in_srgb,var(--success)_30%,transparent)] text-[var(--success-text)]'
      : status === 'PARTIAL' || status === 'STALE' || status === 'PENDING_SYNC'
        ? 'border-[color-mix(in_srgb,var(--warning)_35%,transparent)] text-[var(--warning-text)]'
        : status === 'ERROR' || status === 'FORBIDDEN'
          ? 'border-[color-mix(in_srgb,var(--danger)_30%,transparent)] text-[var(--danger-text)]'
          : 'border-[var(--border-soft)] text-muted-foreground';

  return (
    <span className={cn('inline-flex rounded-[8px] border px-1.5 py-0.5 text-[10px] font-medium', tone)}>
      {STATUS_LABEL[status]}
    </span>
  );
}
