'use client';

import { cn } from '@/lib/utils';
import { SearchInput } from '@/components/ui/search-input';
import { FilterSelect } from '@/components/ui/filter-select';

export type PurchaseFilterChip =
  | 'all'
  | 'Brouillon'
  | 'Commandé'
  | 'Reçu partiel'
  | 'Reçu'
  | 'Annulé';

const FILTER_CHIPS: { id: PurchaseFilterChip; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'Brouillon', label: 'Brouillon' },
  { id: 'Commandé', label: 'Commandé' },
  { id: 'Reçu partiel', label: 'Reçu partiel' },
  { id: 'Reçu', label: 'Reçu' },
  { id: 'Annulé', label: 'Annulé' },
];

export type PurchaseSortId = 'date-desc' | 'date-asc' | 'amount-desc' | 'supplier-asc';

const SORT_OPTIONS: { id: PurchaseSortId; label: string }[] = [
  { id: 'date-desc', label: 'Plus récents' },
  { id: 'date-asc', label: 'Plus anciens' },
  { id: 'amount-desc', label: 'Montant décroissant' },
  { id: 'supplier-asc', label: 'Fournisseur A-Z' },
];

type Props = {
  count: number;
  search: string;
  onSearchChange: (v: string) => void;
  sort: PurchaseSortId;
  onSortChange: (v: PurchaseSortId) => void;
  activeChip: PurchaseFilterChip;
  onChipChange: (id: PurchaseFilterChip) => void;
};

export function PurchaseTableToolbar({
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
          placeholder="Rechercher n° commande, fournisseur…"
          className="orion-material-toolbar-search"
          debounceMs={200}
        />
        <FilterSelect
          value={sort}
          onChange={(v) => onSortChange(v as PurchaseSortId)}
          aria-label="Tri"
          options={SORT_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
        />
      </div>
      <div className="orion-material-toolbar-row orion-material-toolbar-row-chips">
        <span className="orion-material-toolbar-count">
          {count.toLocaleString('fr-FR')} commande{count > 1 ? 's' : ''}
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
