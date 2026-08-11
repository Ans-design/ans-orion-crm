'use client';

import { cn } from '@/lib/utils';
import { SearchInput } from '@/components/ui/search-input';
import { FilterSelect } from '@/components/ui/filter-select';
import { STOCK_CATEGORIES } from './StockCategoryBadge';

export type StockFilterChip =
  | 'all'
  | 'critical'
  | 'outOfStock'
  | 'unlinked'
  | (typeof STOCK_CATEGORIES)[number]['id'];

const QUICK_CHIPS: { id: StockFilterChip; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'critical', label: 'Stock critique' },
  { id: 'outOfStock', label: 'Rupture' },
  { id: 'unlinked', label: 'Non lié matière' },
];

type StockSortId = 'label-asc' | 'label-desc' | 'qty-asc' | 'qty-desc' | 'sku-asc';

const SORT_OPTIONS: { id: StockSortId; label: string }[] = [
  { id: 'label-asc', label: 'Libellé A-Z' },
  { id: 'label-desc', label: 'Libellé Z-A' },
  { id: 'sku-asc', label: 'SKU A-Z' },
  { id: 'qty-asc', label: 'Qté croissante' },
  { id: 'qty-desc', label: 'Qté décroissante' },
];

type Props = {
  count: number;
  search: string;
  onSearchChange: (v: string) => void;
  sort: StockSortId;
  onSortChange: (v: StockSortId) => void;
  activeChip: StockFilterChip;
  onChipChange: (id: StockFilterChip) => void;
};

export function StockTableToolbar({
  count,
  search,
  onSearchChange,
  sort,
  onSortChange,
  activeChip,
  onChipChange,
}: Props) {
  const categoryChips = STOCK_CATEGORIES.map((c) => ({ id: c.id as StockFilterChip, label: c.label }));

  return (
    <div className="orion-material-toolbar">
      <div className="orion-material-toolbar-row orion-material-toolbar-row-main orion-filter-toolbar">
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Rechercher SKU, libellé, grammage…"
          className="orion-material-toolbar-search"
          debounceMs={200}
        />
        <FilterSelect
          value={sort}
          onChange={(v) => onSortChange(v as StockSortId)}
          aria-label="Tri"
          options={SORT_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
        />
      </div>

      <div className="orion-material-toolbar-row orion-material-toolbar-row-chips">
        <span className="orion-material-toolbar-count">
          {count.toLocaleString('fr-FR')} article{count > 1 ? 's' : ''}
        </span>
        <div className="orion-admin-table-chips orion-material-filter-chips" role="group" aria-label="Filtres rapides">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={cn(
                'orion-admin-table-chip orion-material-filter-chip',
                activeChip === chip.id && 'is-active',
              )}
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
              className={cn(
                'orion-admin-table-chip orion-material-filter-chip',
                activeChip === chip.id && 'is-active',
              )}
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

export type { StockSortId };
