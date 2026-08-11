import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ORION_GRID_GAP, ORION_SECTION_SPACE } from '@/lib/design/spacing-system';

/** Section ouverte — titre + contenu, sans carte lourde */
export function SectionBlock({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('orion-section-block', className)}>
      {(title || actions) && (
        <div className="orion-section-block-header">
          <div className="min-w-0">
            {title && <h3 className="orion-section-title">{title}</h3>}
            {description && <p className="orion-section-desc">{description}</p>}
          </div>
          {actions && <div className="orion-section-block-actions shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/** Une seule carte de section — ne pas imbriquer d'autres SectionCard */
export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  padded = true,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={cn('orion-section-card', padded && 'orion-section-card-padded', className)}>
      {(title || actions) && (
        <div className="orion-section-block-header mb-3">
          <div className="min-w-0">
            {title && <h3 className="orion-section-title">{title}</h3>}
            {description && <p className="orion-section-desc">{description}</p>}
          </div>
          {actions && <div className="orion-section-block-actions shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/** Grille de métriques — cellules plates, pas de card parente */
export function MetricGrid({
  children,
  columns = 4,
  className,
}: {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5 | 6 | 8;
  className?: string;
}) {
  const colClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
    8: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-8',
  }[columns];

  return (
    <div className={cn('orion-metric-grid', ORION_GRID_GAP.standard, colClass, className)} role="list">
      {children}
    </div>
  );
}

export function MetricCell({
  label,
  value,
  tone = 'default',
  className,
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'default' | 'ok' | 'warn' | 'danger' | 'brand' | 'gold';
  className?: string;
}) {
  return (
    <div className={cn('orion-metric-cell', `orion-metric-cell--${tone}`, className)} role="listitem">
      <p className="orion-metric-value">{value}</p>
      <p className="orion-metric-label">{label}</p>
    </div>
  );
}

/** Alerte directe — pas de wrapper card parent */
export function AlertCard({
  title,
  description,
  children,
  action,
  tone = 'warning',
  className,
  icon: Icon,
}: {
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  tone?: 'warning' | 'danger' | 'info' | 'success';
  className?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className={cn('orion-alert-card', `orion-alert-card--${tone}`, className)} role="alert">
      {Icon && <Icon size={18} strokeWidth={1.75} className="orion-alert-card-icon shrink-0" aria-hidden />}
      <div className="min-w-0 flex-1">
        <p className="orion-alert-card-title">{title}</p>
        {description && <div className="orion-alert-card-desc">{description}</div>}
        {children}
      </div>
      {action && <div className="orion-alert-card-action shrink-0">{action}</div>}
    </div>
  );
}

export function StatusGrid({
  children,
  columns = 3,
  className,
}: {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const colClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
  }[columns];

  return <div className={cn('orion-status-grid', colClass, className)}>{children}</div>;
}

export function StatusPill({
  label,
  detail,
  ok,
  warn,
  className,
}: {
  label: string;
  detail?: React.ReactNode;
  ok?: boolean;
  warn?: boolean;
  className?: string;
}) {
  const tone = ok ? 'ok' : warn ? 'warn' : 'neutral';
  return (
    <div className={cn('orion-status-pill', `orion-status-pill--${tone}`, className)}>
      <p className="orion-status-pill-label">{label}</p>
      {detail && <div className="orion-status-pill-detail">{detail}</div>}
    </div>
  );
}

/** Empilement de sections sans cartes imbriquées */
export function SectionStack({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('orion-section-stack', ORION_SECTION_SPACE.standard, className)}>{children}</div>;
}
