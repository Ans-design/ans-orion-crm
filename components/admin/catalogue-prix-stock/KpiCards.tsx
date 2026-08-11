'use client';

import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Copy,
  Layers,
  Package,
  Scissors,
  ShoppingBag,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type KpiId =
  | 'articles'
  | 'options'
  | 'matieres'
  | 'missing-prices'
  | 'anomalies'
  | 'doublons';

export type KpiItem = {
  id: KpiId;
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'warn' | 'danger';
  icon?: LucideIcon;
};

const DEFAULT_ICONS: Record<KpiId, LucideIcon> = {
  articles: ShoppingBag,
  options: Layers,
  matieres: Scissors,
  'missing-prices': AlertTriangle,
  anomalies: AlertTriangle,
  doublons: Copy,
};

type Props = {
  items: KpiItem[];
  activeId?: KpiId | null;
  onSelect?: (id: KpiId) => void;
};

/** KPI raffinés — typo sidebar, ombre card-organic, pas de gros chiffres. */
export function KpiCards({ items, activeId, onSelect }: Props) {
  return (
    <section className="cps-kpi-grid grid w-full grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => {
        const Icon = item.icon ?? DEFAULT_ICONS[item.id] ?? Package;
        const warn = item.tone === 'warn';
        const danger = item.tone === 'danger';
        const active = activeId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect?.(item.id)}
            className={cn(
              'cps-kpi-card group relative rounded-[7px] border-0 bg-[var(--cps-surface)] px-4 py-3 text-left transition-all',
              'hover:-translate-y-px',
              warn && 'cps-kpi-card--warn',
              danger && 'cps-kpi-card--danger',
              active && 'cps-kpi-card--active',
            )}
          >
            <div className="mb-1.5 flex items-start justify-between gap-2.5">
              <span
                className={cn(
                  'text-meta font-semibold uppercase tracking-[0.06em] leading-snug',
                  warn ? 'text-[var(--cps-warn-text)]' : danger ? 'text-[var(--cps-danger-text)]' : 'text-[var(--cps-muted)]',
                )}
              >
                {item.label}
              </span>
              <span
                className={cn(
                  'rounded-[7px] p-1 transition-colors',
                  warn
                    ? 'bg-amber-500/10 text-[var(--cps-warn-text)]'
                    : danger
                      ? 'bg-red-500/10 text-[var(--cps-danger-text)]'
                      : 'text-[var(--cps-gold)] opacity-80 group-hover:opacity-100',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="flex items-baseline gap-2.5">
              <span
                className={cn(
                  'text-body-l font-bold tracking-tight tabular-nums leading-none',
                  warn ? 'text-[var(--cps-warn-text)]' : danger ? 'text-[var(--cps-danger-text)]' : 'text-[var(--cps-title)]',
                )}
              >
                {item.value}
              </span>
              {item.hint ? (
                <span
                  className={cn(
                    'text-meta font-medium leading-none',
                    warn ? 'text-[var(--cps-warn-text)]' : danger ? 'text-[var(--cps-danger-text)]' : 'text-[var(--cps-muted)]',
                  )}
                >
                  {item.hint}
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </section>
  );
}
