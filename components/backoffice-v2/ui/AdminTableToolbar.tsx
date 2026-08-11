'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type AdminTableFilterChip = {
  id: string;
  label: string;
};

type Props = {
  title: string;
  count?: number;
  unpublishedCount?: number;
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  filterChips?: AdminTableFilterChip[];
  activeFilterId?: string;
  onFilterChange?: (id: string) => void;
  viewTabs?: { id: string; label: string }[];
  activeViewId?: string;
  onViewChange?: (id: string) => void;
  toolbarRight?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function AdminTableToolbar({
  title,
  count,
  unpublishedCount,
  search,
  onSearchChange,
  searchPlaceholder = 'Rechercher…',
  filterChips,
  activeFilterId,
  onFilterChange,
  viewTabs,
  activeViewId,
  onViewChange,
  toolbarRight,
  children,
  className,
}: Props) {
  return (
    <div className={cn('orion-admin-table-root', className)}>
      <div className="orion-admin-table-toolbar">
        <div className="orion-admin-table-toolbar-left">
          <h3>{title}</h3>
          <p className="orion-admin-table-toolbar-meta">
            {count != null && (
              <>
                <strong>{count.toLocaleString('fr-FR')}</strong> éléments
              </>
            )}
            {unpublishedCount != null && unpublishedCount > 0 && (
              <>
                {count != null && ' · '}
                <strong>{unpublishedCount}</strong> non publié{unpublishedCount > 1 ? 's' : ''}
              </>
            )}
          </p>
        </div>

        {onSearchChange && (
          <div className="orion-admin-table-toolbar-center">
            <input
              type="search"
              className="orion-admin-table-search"
              placeholder={searchPlaceholder}
              value={search ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}

        <div className="orion-admin-table-toolbar-right">
          {viewTabs && viewTabs.length > 0 && onViewChange && (
            <div className="orion-admin-table-view-tabs" role="tablist">
              {viewTabs.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  role="tab"
                  aria-selected={activeViewId === v.id}
                  className={cn('orion-admin-table-view-tab', activeViewId === v.id && 'is-active')}
                  onClick={() => onViewChange(v.id)}
                >
                  {v.label}
                </button>
              ))}
            </div>
          )}
          {toolbarRight}
        </div>
      </div>

      {filterChips && filterChips.length > 0 && onFilterChange && (
        <div className="orion-admin-table-chips" role="group" aria-label="Filtres">
          {filterChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={cn('orion-admin-table-chip', activeFilterId === chip.id && 'is-active')}
              onClick={() => onFilterChange(chip.id)}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {children}
    </div>
  );
}
