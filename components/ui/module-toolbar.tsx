'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { AppFilterBar } from '@/components/ui/app-filter-bar';
import { SearchInput } from '@/components/ui/search-input';

type ChipFilter = { id: string; label: string };

type Props = {
  search?: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    className?: string;
  };
  chips?: ChipFilter[];
  chipValue?: string;
  onChipChange?: (id: string) => void;
  filters?: ReactNode;
  viewToggle?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/** Barre outils module : recherche + filtres + vues + actions */
export function ModuleToolbar({
  search,
  chips,
  chipValue,
  onChipChange,
  filters,
  viewToggle,
  actions,
  className,
}: Props) {
  return (
    <div className={cn('orion-module-toolbar', className)}>
      <div className="orion-module-toolbar-main orion-filter-toolbar">
        {search && (
          <SearchInput
            value={search.value}
            onChange={search.onChange}
            placeholder={search.placeholder ?? 'Rechercher…'}
            className={cn('orion-module-toolbar-search', search.className)}
            debounceMs={250}
          />
        )}
        {filters}
        {viewToggle}
      </div>
      {(chips?.length || actions) && (
        <div className="orion-module-toolbar-secondary">
          {chips && chipValue != null && onChipChange && (
            <AppFilterBar options={chips} value={chipValue} onChange={onChipChange} />
          )}
          {actions && <div className="orion-module-toolbar-actions">{actions}</div>}
        </div>
      )}
    </div>
  );
}
