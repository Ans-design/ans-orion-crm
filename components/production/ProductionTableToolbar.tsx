'use client';

import { cn } from '@/lib/utils';
import { SearchInput } from '@/components/ui/search-input';
import { FilterSelect } from '@/components/ui/filter-select';

export const PRODUCTION_STATUTS = ['En attente', 'En cours', 'Terminé', 'Bloqué'] as const;

export type ProductionFilterChip = 'all' | (typeof PRODUCTION_STATUTS)[number];

const FILTER_CHIPS: { id: ProductionFilterChip; label: string }[] = [
  { id: 'all', label: 'Tous' },
  ...PRODUCTION_STATUTS.map((s) => ({ id: s as ProductionFilterChip, label: s })),
];

export type ProductionSortId = 'date-desc' | 'priority' | 'client-asc';

const SORT_OPTIONS: { id: ProductionSortId; label: string }[] = [
  { id: 'date-desc', label: 'Plus récents' },
  { id: 'priority', label: 'Priorité' },
  { id: 'client-asc', label: 'Client A-Z' },
];

type Props = {
  count: number;
  search: string;
  onSearchChange: (v: string) => void;
  sort: ProductionSortId;
  onSortChange: (v: ProductionSortId) => void;
  activeChip: ProductionFilterChip;
  onChipChange: (id: ProductionFilterChip) => void;
};

export function ProductionTableToolbar({
  count,
  search,
  onSearchChange,
  sort,
  onSortChange,
  activeChip,
  onChipChange,
}: Props) {
  return (
    <div className="orion-material-toolbar">
      <div className="orion-material-toolbar-row orion-material-toolbar-row-main orion-filter-toolbar">
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Rechercher ordre, client, article…"
          className="orion-material-toolbar-search"
          debounceMs={200}
        />
        <FilterSelect
          value={sort}
          onChange={(v) => onSortChange(v as ProductionSortId)}
          aria-label="Tri"
          options={SORT_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
        />
      </div>
      <div className="orion-material-toolbar-row orion-material-toolbar-row-chips">
        <span className="orion-material-toolbar-count">
          {count.toLocaleString('fr-FR')} ordre{count > 1 ? 's' : ''}
        </span>
        <div className="orion-admin-table-chips orion-material-filter-chips" role="group" aria-label="Filtres rapides">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={cn('orion-admin-table-chip orion-material-filter-chip', activeChip === chip.id && 'is-active')}
              onClick={() => onChipChange(chip.id)}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
