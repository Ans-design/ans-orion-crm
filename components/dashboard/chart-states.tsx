'use client';

import type { LucideIcon } from 'lucide-react';
import { BarChart3, RefreshCw, AlertTriangle } from 'lucide-react';

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div
      className="animate-pulse rounded-[7px] bg-[var(--border-subtle)]/60 flex items-center justify-center"
      style={{ minHeight: height }}
      aria-busy="true"
    >
      <p className="text-xs text-[var(--text-muted)]">Chargement des données…</p>
    </div>
  );
}

/** État vide unique pour tous les graphiques (widgets + CA + top articles + machines). */
export function ChartEmpty({
  title,
  label,
  description,
  minHeight = 200,
  icon: Icon = BarChart3,
  className = '',
}: {
  /** Titre principal */
  title?: string;
  /** Alias de title (compat widgets) */
  label?: string;
  description?: string;
  minHeight?: number;
  icon?: LucideIcon;
  className?: string;
}) {
  const heading = title ?? label ?? 'Aucune donnée';
  return (
    <div
      className={`cockpit-empty-state flex-1 ${className}`}
      style={{ minHeight }}
    >
      <Icon className="h-8 w-8 text-[var(--text-muted)]" />
      <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">{heading}</p>
      {description ? (
        <p className="mt-1 max-w-md text-xs text-[var(--text-secondary)] text-center">{description}</p>
      ) : null}
    </div>
  );
}

export function ChartError({
  title,
  onRetry,
}: {
  title: string;
  onRetry?: () => void;
}) {
  return (
    <div className="cockpit-empty-state min-h-[220px] flex-1">
      <AlertTriangle className="h-8 w-8 text-[var(--ans-red)]" />
      <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">{title}</p>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">
        Impossible de charger les données du graphique.
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-primary)] hover:underline"
        >
          <RefreshCw size={12} /> Réessayer
        </button>
      )}
    </div>
  );
}

export function ChartCardFooter({
  updatedAt,
  onRefresh,
}: {
  updatedAt?: string;
  onRefresh?: () => void;
}) {
  return (
    <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)]">
      {updatedAt ? (
        <p className="text-[10px] text-[var(--text-muted)]">
          Dernière mise à jour : {updatedAt}
        </p>
      ) : (
        <span />
      )}
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className="text-[10px] font-medium text-[var(--text-secondary)] hover:text-[var(--brand-primary)] inline-flex items-center gap-1"
        >
          <RefreshCw size={10} /> Actualiser
        </button>
      )}
    </div>
  );
}
