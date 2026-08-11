'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PillTab<T extends string = string> = {
  id: T;
  label: string;
  icon?: LucideIcon;
  badge?: string | number;
  /** Groupe visuel — séparateur entre groupes */
  group?: string;
  /** Si true, l’onglet va dans le menu « Plus » (toujours accessible) */
  overflow?: boolean;
};

type Props<T extends string> = {
  tabs: readonly PillTab<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel?: string;
  className?: string;
};

const GROUP_LABEL: Record<string, string> = {
  catalogue: 'Catalogue',
  tarif: 'Tarifs',
  outils: 'Outils',
};

/** Onglets pills raffinés — densifiés type sidebar, groupes + overflow. */
export function PillTabs<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel = 'Sections',
  className,
}: Props<T>) {
  const [openPlus, setOpenPlus] = useState(false);
  const plusRef = useRef<HTMLDivElement>(null);

  const { main, overflow, overflowActive } = useMemo(() => {
    const mainTabs = tabs.filter((t) => !t.overflow);
    const overflowTabs = tabs.filter((t) => t.overflow);
    const activeInOverflow = overflowTabs.some((t) => t.id === value);
    return { main: mainTabs, overflow: overflowTabs, overflowActive: activeInOverflow };
  }, [tabs, value]);

  useEffect(() => {
    if (!openPlus) return;
    const onDoc = (e: MouseEvent) => {
      if (plusRef.current && !plusRef.current.contains(e.target as Node)) setOpenPlus(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [openPlus]);

  let lastGroup: string | undefined;

  return (
    <nav
      className={cn(
        'cps-pill-nav cps-no-scrollbar flex w-full items-center gap-0.5 overflow-x-auto border-0 bg-transparent p-0',
        className,
      )}
      aria-label={ariaLabel}
      role="tablist"
    >
      {main.map((t, index) => {
        const active = value === t.id;
        const Icon = t.icon;
        const showSep = t.group && lastGroup && t.group !== lastGroup;
        const showGroupHint = t.group && t.group !== lastGroup;
        lastGroup = t.group ?? lastGroup;
        return (
          <span key={t.id} className="inline-flex shrink-0 items-center">
            {showSep ? <span className="cps-pill-sep mx-1.5 h-4 w-px shrink-0 bg-[var(--cps-border)]" aria-hidden /> : null}
            {showGroupHint && t.group && GROUP_LABEL[t.group] ? (
              <span className="cps-pill-group-label mr-1 hidden select-none text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--cps-muted)] xl:inline">
                {GROUP_LABEL[t.group]}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => onChange(t.id)}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') return;
                event.preventDefault();
                const nextIndex =
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? main.length - 1
                      : (index + (event.key === 'ArrowRight' ? 1 : -1) + main.length) % main.length;
                onChange(main[nextIndex]!.id);
                const tablist = event.currentTarget.closest('[role="tablist"]');
                const buttons = tablist?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
                requestAnimationFrame(() => buttons?.[nextIndex]?.focus());
              }}
              aria-current={active ? 'page' : undefined}
              aria-selected={active}
              role="tab"
              tabIndex={active ? 0 : -1}
              className={cn(
                'cps-pill inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[7px] text-[12px] font-semibold leading-none transition-colors',
                active
                  ? 'bg-[var(--cps-brand)] text-white shadow-sm'
                  : 'text-[var(--cps-muted)] hover:bg-[var(--cps-surface)] hover:text-[var(--cps-title)]',
              )}
            >
              {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
              {t.label}
              {t.badge != null && t.badge !== '' ? (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums',
                    active ? 'bg-white/20 text-white' : 'bg-[var(--cps-surface-2)] text-[var(--cps-muted)]',
                  )}
                >
                  {t.badge}
                </span>
              ) : null}
            </button>
          </span>
        );
      })}

      {overflow.length > 0 ? (
        <div ref={plusRef} className="relative ml-1 inline-flex shrink-0">
          <span className="cps-pill-sep mx-1.5 h-4 w-px shrink-0 bg-[var(--cps-border)]" aria-hidden />
          <button
            type="button"
            onClick={() => setOpenPlus((v) => !v)}
            aria-expanded={openPlus}
            aria-haspopup="menu"
            className={cn(
              'cps-pill inline-flex items-center gap-1.5 rounded-[7px] text-[12px] font-semibold leading-none transition-colors',
              overflowActive || openPlus
                ? 'bg-[var(--cps-brand)] text-white'
                : 'text-[var(--cps-muted)] hover:bg-[var(--cps-surface)] hover:text-[var(--cps-title)]',
            )}
          >
            Plus
            <ChevronDown className={cn('h-3 w-3 transition-transform', openPlus && 'rotate-180')} />
          </button>
          {openPlus ? (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+6px)] z-40 min-w-[180px] overflow-hidden rounded-[7px] border border-[var(--cps-border)] bg-[var(--cps-surface)] py-1 shadow-[var(--cps-shadow)]"
            >
              {overflow.map((t) => {
                const active = value === t.id;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onChange(t.id);
                      setOpenPlus(false);
                    }}
                    className={cn(
                      'flex w-full items-center px-3 py-2 text-left text-[12px] font-medium transition-colors',
                      active
                        ? 'bg-[var(--cps-brand-soft)] text-[var(--cps-brand)]'
                        : 'text-[var(--cps-title)] hover:bg-[var(--cps-surface-2)]',
                    )}
                  >
                    {Icon ? <Icon className="mr-2 h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
                    {t.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}
