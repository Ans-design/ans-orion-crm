'use client';

import { memo, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import type { CatalogCounters } from './article-catalog-types';
import { AppButton } from '@/components/ui/app-ui';

type Props = {
  value: string;
  onChange: (v: string) => void;
  counters: CatalogCounters;
  onSync?: () => void;
  onCreate?: () => void;
  syncing?: boolean;
  canEdit?: boolean;
  autoFocus?: boolean;
};

export const ArticleSearchBar = memo(function ArticleSearchBar({
  value,
  onChange,
  counters,
  onSync,
  onCreate,
  syncing,
  canEdit,
  autoFocus,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  return (
    <div className="acat-search-sticky">
      <div className="acat-search-stack">
        <div className="acat-search-wrap">
          <Search className="acat-search-icon" aria-hidden strokeWidth={2} />
          <input
            ref={inputRef}
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Rechercher un article, une catégorie, une matière…"
            aria-label="Rechercher dans le catalogue"
            className="acat-search-input"
          />
          {value ? (
            <button
              type="button"
              className="acat-search-clear"
              onClick={() => onChange('')}
              aria-label="Effacer la recherche"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.25} />
            </button>
          ) : null}
        </div>

        <div className="acat-search-meta">
          <div className="acat-counters" aria-live="polite">
            <span className="acat-counter-pill">
              <strong>{counters.total}</strong> articles
            </span>
            <span className="acat-counter-pill is-ok">
              <strong>{counters.active}</strong> actifs
            </span>
            <span className="acat-counter-pill is-warn">
              <strong>{counters.draft}</strong> à compléter
            </span>
            {counters.filtered !== counters.total ? (
              <span className="acat-counter-pill is-filter">
                <strong>{counters.filtered}</strong> affichés
              </span>
            ) : null}
          </div>

          <div className="acat-search-actions">
            {canEdit && onCreate ? (
              <AppButton
                type="button"
                variant="default"
                size="sm"
                className="acat-create-btn"
                onClick={onCreate}
                title="Créer un nouvel article catalogue"
              >
                + Nouvel article
              </AppButton>
            ) : null}
            {canEdit && onSync ? (
              <AppButton
                type="button"
                variant="ghost"
                size="sm"
                className="acat-sync-btn"
                onClick={onSync}
                disabled={syncing}
                title="Synchroniser catalogue → profils tarifaires"
              >
                {syncing ? 'Sync…' : 'Sync POS'}
              </AppButton>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
});
