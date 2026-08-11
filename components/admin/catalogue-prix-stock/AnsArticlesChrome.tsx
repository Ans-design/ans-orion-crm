'use client';

import type { ReactNode } from 'react';
import { ChevronDown, Package, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import './ans-articles-table.css';

export type AnsAtFamilyTab = {
  id: string;
  label: string;
  count: number;
};

export type AnsAtMetric = {
  value: string | number;
  label: string;
  tone?: 'green' | 'amber' | 'coral';
};

type Props = {
  className?: string;
  leadLabel?: string;
  leadValue: string;
  metrics: AnsAtMetric[];
  qualityPct?: number | null;
  qualityLabel?: string;
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  showSearchKbd?: boolean;
  /** Familles — liste déroulante (évite le défilement horizontal) */
  families?: AnsAtFamilyTab[];
  family?: string;
  onFamilyChange?: (id: string) => void;
  tools?: ReactNode;
  footerLeft?: ReactNode;
  footerRight?: ReactNode;
  children: ReactNode;
};

export function AnsArticlesChrome({
  className,
  leadLabel = 'Catalogue actif',
  leadValue,
  metrics,
  qualityPct = null,
  qualityLabel = 'Qualité du catalogue',
  search,
  onSearchChange,
  searchPlaceholder = 'Rechercher…',
  showSearchKbd = true,
  families,
  family = 'all',
  onFamilyChange,
  tools,
  footerLeft,
  footerRight,
  children,
}: Props) {
  const showToolbar = onSearchChange != null || tools != null || Boolean(families?.length);
  const showFamilies = Boolean(families?.length && onFamilyChange);
  const activeFamily = families?.find((f) => f.id === family) ?? families?.[0];

  return (
    <div className={cn('ans-at', className)}>
      <section className="ans-at__summary" aria-label="Résumé catalogue">
        <div className="ans-at__summary-lead">
          <span className="ans-at__summary-icon" aria-hidden>
            <Package size={20} strokeWidth={2} />
          </span>
          <div>
            <small>{leadLabel}</small>
            <strong>{leadValue}</strong>
          </div>
        </div>
        <div className="ans-at__divider" aria-hidden />
        {metrics.slice(0, 3).map((m) => (
          <div key={m.label} className="ans-at__metric">
            <i
              className={cn(
                'ans-at__dot',
                m.tone === 'amber' && 'is-amber',
                m.tone === 'coral' && 'is-coral',
                (!m.tone || m.tone === 'green') && 'is-green',
              )}
              aria-hidden
            />
            <div>
              <strong>{m.value}</strong>
              <small>{m.label}</small>
            </div>
          </div>
        ))}
        {qualityPct != null ? (
          <div className="ans-at__quality">
            <div className="ans-at__quality-copy">
              <span>{qualityLabel}</span>
              <strong>{Math.round(qualityPct)} %</strong>
            </div>
            <div className="ans-at__track">
              <i style={{ width: `${Math.max(0, Math.min(100, qualityPct))}%` }} />
            </div>
          </div>
        ) : (
          <div className="ans-at__quality" aria-hidden />
        )}
      </section>

      <section className="ans-at__catalogue">
        {showToolbar ? (
          <div className="ans-at__toolbar">
            {onSearchChange ? (
              <label className="ans-at__search">
                <Search size={16} strokeWidth={1.8} aria-hidden />
                <input
                  value={search ?? ''}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                />
                {showSearchKbd ? <kbd>Ctrl K</kbd> : null}
              </label>
            ) : (
              <div />
            )}
            <div className="ans-at__tools">
              {showFamilies ? (
                <label className="ans-at__family-select">
                  <span className="sr-only">Famille</span>
                  <select
                    value={family}
                    onChange={(e) => onFamilyChange!(e.target.value)}
                    aria-label="Filtrer par famille"
                  >
                    {families!.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label} ({f.count})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="ans-at__family-select-ico" aria-hidden />
                  {activeFamily ? (
                    <span className="ans-at__family-select-hint" aria-hidden>
                      {activeFamily.count}
                    </span>
                  ) : null}
                </label>
              ) : null}
              {tools}
            </div>
          </div>
        ) : null}

        {children}

        {footerLeft || footerRight ? (
          <footer className="ans-at__footer">
            <div>{footerLeft}</div>
            <div>{footerRight}</div>
          </footer>
        ) : null}
      </section>
    </div>
  );
}

const TONE_CYCLE = [
  'tone-violet',
  'tone-cyan',
  'tone-rose',
  'tone-amber',
  'tone-blue',
  'tone-green',
  'tone-orange',
  'tone-indigo',
  'tone-purple',
] as const;

export function ansAtToneFor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h + key.charCodeAt(i) * (i + 1)) % TONE_CYCLE.length;
  return TONE_CYCLE[h] ?? 'tone-blue';
}

export function ansAtInitials(name: string): string {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}
