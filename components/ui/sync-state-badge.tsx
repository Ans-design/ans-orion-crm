/**
 * Badge d’état de synchronisation — V12 / V11 UX.
 * Ne remplace pas la source de vérité serveur.
 */

import { cn } from '@/lib/utils';

export type SyncUiStatus =
  | 'saved'
  | 'publishing'
  | 'synced'
  | 'queued'
  | 'partial'
  | 'error'
  | 'stale';

const LABELS: Record<SyncUiStatus, string> = {
  saved: 'Enregistré',
  publishing: 'En publication',
  synced: 'Synchronisé',
  queued: 'En file',
  partial: 'Partiel',
  error: 'Erreur sync',
  stale: 'Données anciennes',
};

const STYLES: Record<SyncUiStatus, string> = {
  saved: 'bg-[var(--bg-chip)] text-[var(--text-muted)] border-[var(--border-soft)]',
  publishing: 'bg-[color-mix(in_srgb,var(--info)_12%,transparent)] text-[var(--info-text,#1D4ED8)] border-[color-mix(in_srgb,var(--info)_30%,transparent)]',
  synced: 'bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success-text)] border-[color-mix(in_srgb,var(--success)_30%,transparent)]',
  queued: 'bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] text-[var(--warning-text)] border-[color-mix(in_srgb,var(--warning)_30%,transparent)]',
  partial: 'bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning-text)] border-[color-mix(in_srgb,var(--warning)_35%,transparent)]',
  error: 'bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger-text)] border-[color-mix(in_srgb,var(--danger)_30%,transparent)]',
  stale: 'bg-[var(--bg-chip)] text-[var(--text-muted)] border-[var(--border-soft)]',
};

export function SyncStateBadge({
  status,
  asOf,
  className,
}: {
  status: SyncUiStatus;
  /** ISO date — fraîcheur affichée */
  asOf?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[var(--radius-control,8px)] border px-2 py-0.5 text-xs font-medium',
        STYLES[status],
        className,
      )}
      title={asOf ? `asOf ${asOf}` : LABELS[status]}
      data-sync-status={status}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full',
          status === 'synced' && 'bg-[var(--success)]',
          status === 'error' && 'bg-[var(--danger)]',
          status === 'partial' && 'bg-[var(--warning)]',
          status === 'queued' && 'bg-[var(--warning)]',
          status === 'publishing' && 'bg-[var(--info,#2563EB)]',
          (status === 'saved' || status === 'stale') && 'bg-[var(--text-muted)]',
        )}
        aria-hidden
      />
      <span>{LABELS[status]}</span>
      {asOf ? (
        <span className="font-mono text-[10px] opacity-80 tabular-nums">
          {new Date(asOf).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      ) : null}
    </span>
  );
}
