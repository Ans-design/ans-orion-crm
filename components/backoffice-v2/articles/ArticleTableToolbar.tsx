'use client';

import { cn } from '@/lib/utils';
import { adminStatusFilterLabel } from '@/lib/administration/admin-ui-vocab';

export type ArticleFilterChip =
  | 'all'
  | 'missingPrice'
  | 'unlinked'
  | 'draft'
  | 'published'
  | 'archived'
  | 'pos'
  | 'anomalies';

export type ArticleSortId =
  | 'name-asc'
  | 'name-desc'
  | 'family-asc'
  | 'price-asc'
  | 'price-desc';

const FILTER_CHIPS: { id: ArticleFilterChip; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'missingPrice', label: 'Prix manquant' },
  { id: 'unlinked', label: 'Stock non lié' },
  { id: 'draft', label: adminStatusFilterLabel('draft') },
  { id: 'published', label: adminStatusFilterLabel('published') },
  { id: 'archived', label: adminStatusFilterLabel('archived') },
  { id: 'pos', label: 'Visible POS' },
  { id: 'anomalies', label: 'Anomalies' },
];

const SORT_OPTIONS: { id: ArticleSortId; label: string }[] = [
  { id: 'name-asc', label: 'Nom A-Z' },
  { id: 'name-desc', label: 'Nom Z-A' },
  { id: 'family-asc', label: 'Famille A-Z' },
  { id: 'price-asc', label: 'Prix croissant' },
  { id: 'price-desc', label: 'Prix décroissant' },
];

type Props = {
  count: number;
  search: string;
  onSearchChange: (v: string) => void;
  families: string[];
  family: string;
  onFamilyChange: (v: string) => void;
  sort: ArticleSortId;
  onSortChange: (v: ArticleSortId) => void;
  activeChip: ArticleFilterChip;
  onChipChange: (id: ArticleFilterChip) => void;
};

export function ArticleTableToolbar({
  count,
  search,
  onSearchChange,
  families,
  family,
  onFamilyChange,
  sort,
  onSortChange,
  activeChip,
  onChipChange,
}: Props) {
  return (
    <div className="orion-material-toolbar">
      <div className="orion-material-toolbar-row orion-material-toolbar-row-main">
        <input
          type="search"
          className="orion-admin-table-search orion-material-toolbar-search"
          placeholder="Recherche article, référence, famille…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Recherche articles"
        />

        <select
          className="orion-material-toolbar-select"
          value={family}
          onChange={(e) => onFamilyChange(e.target.value)}
          aria-label="Famille"
        >
          <option value="all">Toutes familles</option>
          {families.filter((f) => f !== 'all').map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>

        <select
          className="orion-material-toolbar-select"
          value={sort}
          onChange={(e) => onSortChange(e.target.value as ArticleSortId)}
          aria-label="Tri"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="orion-material-toolbar-row orion-material-toolbar-row-chips">
        <span className="orion-material-toolbar-count">
          {count.toLocaleString('fr-FR')} résultat{count > 1 ? 's' : ''}
        </span>
        <div className="orion-admin-table-chips orion-material-filter-chips" role="group" aria-label="Filtres rapides">
          {FILTER_CHIPS.map((chip) => (
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
