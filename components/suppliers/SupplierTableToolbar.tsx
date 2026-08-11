'use client';

import { cn } from '@/lib/utils';
import { SearchInput } from '@/components/ui/search-input';
import { FilterSelect } from '@/components/ui/filter-select';

export const SUPPLIER_CATEGORIES = ['Papier', 'Encre', 'Textile', 'Consommable'] as const;

export type SupplierFilterChip =
  | 'all'
  | 'actif'
  | 'inactif'
  | (typeof SUPPLIER_CATEGORIES)[number];

const QUICK_CHIPS: { id: SupplierFilterChip; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'actif', label: 'Actifs' },
  { id: 'inactif', label: 'Inactifs' },
];

export type SupplierSortId = 'name-asc' | 'name-desc' | 'orders-desc';

const SORT_OPTIONS: { id: SupplierSortId; label: string }[] = [
  { id: 'name-asc', label: 'Nom A-Z' },
  { id: 'name-desc', label: 'Nom Z-A' },
  { id: 'orders-desc', label: 'Plus d\'achats' },
];

type Props = {
  count: number;
  search: string;
  onSearchChange: (v: string) => void;
  sort: SupplierSortId;
  onSortChange: (v: SupplierSortId) => void;
  activeChip: SupplierFilterChip;
  onChipChange: (id: SupplierFilterChip) => void;
};

export function SupplierTableToolbar({
  count,
  search,
  onSearchChange,
  sort,
  onSortChange,
  activeChip,
  onChipChange,
}: Props) {
  const categoryChips = SUPPLIER_CATEGORIES.map((c) => ({ id: c as SupplierFilterChip, label: c }));

  return (
    <div className="orion-material-toolbar">
      <div className="orion-material-toolbar-row orion-material-toolbar-row-main orion-filter-toolbar">
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Rechercher nom, code, contact…"
          className="orion-material-toolbar-search"
          debounceMs={200}
        />
        <FilterSelect
          value={sort}
          onChange={(v) => onSortChange(v as SupplierSortId)}
          aria-label="Tri"
          options={SORT_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
        />
      </div>
      <div className="orion-material-toolbar-row orion-material-toolbar-row-chips">
        <span className="orion-material-toolbar-count">
          {count.toLocaleString('fr-FR')} fournisseur{count > 1 ? 's' : ''}
        </span>
        <div className="orion-admin-table-chips orion-material-filter-chips" role="group" aria-label="Filtres rapides">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={cn('orion-admin-table-chip orion-material-filter-chip', activeChip === chip.id && 'is-active')}
              onClick={() => onChipChange(chip.id)}
            >
              {chip.label}
            </button>
          ))}
          <span className="orion-stock-filter-chip-sep" aria-hidden>·</span>
          {categoryChips.map((chip) => (
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
