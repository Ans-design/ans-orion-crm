'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Columns3, ChevronDown, Search, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  MATERIAL_COLUMN_PRESETS,
  MATERIAL_MASTER_TOGGLEABLE_COLUMNS,
  MATERIAL_TOGGLEABLE_COLUMNS,
  type MaterialColumnPresetId,
} from '@/lib/backoffice/material-table-columns';

export type MaterialFilterChip =
  | 'all'
  | 'missingPrice'
  | 'unlinked'
  | 'draft'
  | 'published'
  | 'pos'
  | 'verify';

export type MaterialSortId =
  | 'logical'
  | 'name-asc'
  | 'name-desc'
  | 'family-asc'
  | 'price-asc'
  | 'price-desc';

const FILTER_CHIPS: { id: MaterialFilterChip; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'missingPrice', label: 'Prix manquant' },
  { id: 'unlinked', label: 'Stock non lié' },
  { id: 'pos', label: 'Visible POS' },
  { id: 'verify', label: 'À vérifier' },
];

const SORT_OPTIONS: { id: MaterialSortId; label: string }[] = [
  { id: 'logical', label: 'Tri logique (recommandé)' },
  { id: 'name-asc', label: 'Nom A-Z' },
  { id: 'name-desc', label: 'Nom Z-A' },
  { id: 'family-asc', label: 'Famille A-Z' },
  { id: 'price-asc', label: 'Prix croissant' },
  { id: 'price-desc', label: 'Prix décroissant' },
];

const STOCK_LABELS: Record<'ok' | 'low' | 'out', string> = {
  ok: 'Disponible',
  low: 'Faible',
  out: 'Rupture',
};

type Props = {
  count: number;
  search: string;
  onSearchChange: (v: string) => void;
  families: string[];
  family: string;
  onFamilyChange: (v: string) => void;
  sort: MaterialSortId;
  onSortChange: (v: MaterialSortId) => void;
  activeChip: MaterialFilterChip;
  onChipChange: (id: MaterialFilterChip) => void;
  columnPreset: MaterialColumnPresetId;
  onColumnPresetChange: (id: MaterialColumnPresetId) => void;
  hiddenColumnIds: string[];
  onToggleColumn: (id: string) => void;
  /** Table maîtresse 27 colonnes — masque les préréglages legacy. */
  masterMode?: boolean;
  onShowAllColumns?: () => void;
  onResetFilters?: () => void;
  excelActions?: ReactNode;
  /** Filtre stock (page Matières & tarifs). */
  stockFilter?: 'all' | 'ok' | 'low' | 'out';
  onStockFilterChange?: (v: 'all' | 'ok' | 'low' | 'out') => void;
  density?: 'comfortable' | 'compact';
  onDensityChange?: (v: 'comfortable' | 'compact') => void;
  /** Bouton Corbeille (page Matières & tarifs). */
  onOpenCorbeille?: () => void;
};

export function MaterialTableToolbar({
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
  columnPreset,
  onColumnPresetChange,
  hiddenColumnIds,
  onToggleColumn,
  masterMode = false,
  onShowAllColumns,
  onResetFilters,
  excelActions,
  stockFilter = 'all',
  onStockFilterChange,
  density = 'comfortable',
  onDensityChange,
  onOpenCorbeille,
}: Props) {
  const [columnsOpen, setColumnsOpen] = useState(false);
  const columnsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!columnsOpen) return;
    const close = (e: MouseEvent) => {
      if (columnsRef.current && !columnsRef.current.contains(e.target as Node)) {
        setColumnsOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [columnsOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const hasActiveFilters =
    Boolean(search.trim())
    || family !== 'all'
    || activeChip !== 'all'
    || (stockFilter !== 'all' && Boolean(onStockFilterChange));

  const activePills: { key: string; label: string; clear: () => void }[] = [];
  if (family !== 'all') {
    activePills.push({
      key: 'family',
      label: `Famille : ${family}`,
      clear: () => onFamilyChange('all'),
    });
  }
  if (stockFilter !== 'all' && onStockFilterChange) {
    activePills.push({
      key: 'stock',
      label: `Stock : ${STOCK_LABELS[stockFilter]}`,
      clear: () => onStockFilterChange('all'),
    });
  }
  if (activeChip !== 'all') {
    const chipLabel = FILTER_CHIPS.find((c) => c.id === activeChip)?.label ?? activeChip;
    activePills.push({
      key: 'chip',
      label: `Filtre : ${chipLabel}`,
      clear: () => onChipChange('all'),
    });
  }
  if (search.trim()) {
    activePills.push({
      key: 'search',
      label: `Recherche : ${search.trim()}`,
      clear: () => onSearchChange(''),
    });
  }

  const isAnsAtToolbar = Boolean(masterMode && onStockFilterChange);

  const familyLabel = (f: string) => {
    if (f === 'all') {
      return `Toutes les matières (${count.toLocaleString('fr-FR')})`;
    }
    return f;
  };

  const columnsPanel = (
    <div className="orion-material-toolbar-columns" ref={columnsRef}>
      <button
        type="button"
        className={cn(isAnsAtToolbar ? 'ans-at__tool' : 'orion-material-toolbar-btn')}
        onClick={() => setColumnsOpen((v) => !v)}
        aria-expanded={columnsOpen}
      >
        <Columns3 className="h-3.5 w-3.5" />
        Colonnes
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {columnsOpen && (
        <div className="orion-material-columns-panel" role="dialog" aria-label="Colonnes visibles">
          {!masterMode ? (
            <>
              <p className="orion-material-columns-title">Vue</p>
              {(
                [
                  'master',
                  'unified',
                  'essential',
                  'costs',
                  'stock',
                  'compact',
                  'full',
                  'formats',
                  'usage',
                  'anomalies',
                ] as MaterialColumnPresetId[]
              ).map((id) => (
                <button
                  key={id}
                  type="button"
                  className={cn(
                    'orion-material-columns-preset',
                    columnPreset === id && 'is-active',
                  )}
                  onClick={() => onColumnPresetChange(id)}
                >
                  {MATERIAL_COLUMN_PRESETS[id].label}
                </button>
              ))}
            </>
          ) : null}
          <p className="orion-material-columns-title">Affichage</p>
          {(masterMode ? MATERIAL_MASTER_TOGGLEABLE_COLUMNS : MATERIAL_TOGGLEABLE_COLUMNS).map((col) => (
            <label key={col.id} className="orion-material-columns-check">
              <input
                type="checkbox"
                checked={!hiddenColumnIds.includes(col.id)}
                onChange={() => onToggleColumn(col.id)}
              />
              <span>{col.label}</span>
            </label>
          ))}
          {masterMode && onShowAllColumns ? (
            <button
              type="button"
              className="orion-material-toolbar-btn mt-2 w-full"
              onClick={() => {
                onShowAllColumns();
                setColumnsOpen(false);
              }}
            >
              Vue compacte (recommandée)
            </button>
          ) : null}
        </div>
      )}
    </div>
  );

  if (isAnsAtToolbar) {
    return (
      <div className="orion-material-toolbar is-matieres-tarifs is-ans-at">
        <div className="ans-at__toolbar">
          <label className="ans-at__search">
            <Search size={16} strokeWidth={1.8} aria-hidden />
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Rechercher une matière, une référence, un format…"
              aria-label="Rechercher une matière"
            />
            {search ? (
              <button
                type="button"
                className="ans-at__search-clear"
                aria-label="Effacer la recherche"
                onClick={() => onSearchChange('')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <kbd title="Raccourci recherche">Ctrl K</kbd>
            )}
          </label>

          <div className="ans-at__tools">
            <label className="ans-at__family-select">
              <span className="sr-only">Famille</span>
              <select
                value={family}
                onChange={(e) => onFamilyChange(e.target.value)}
                aria-label="Filtrer par famille"
              >
                {families.map((f) => (
                  <option key={f} value={f}>
                    {familyLabel(f)}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="ans-at__family-select-ico" aria-hidden />
              <span className="ans-at__family-select-hint" aria-hidden>
                {count}
              </span>
            </label>
          </div>
        </div>

        <div className="ans-at__toolbar-secondary" aria-label="Filtres complémentaires">
          <select
            className="ans-at__tool-select"
            value={stockFilter}
            onChange={(e) => onStockFilterChange!(e.target.value as 'all' | 'ok' | 'low' | 'out')}
            aria-label="État du stock"
          >
            <option value="all">Tous les stocks</option>
            <option value="ok">Disponible</option>
            <option value="low">Faible</option>
            <option value="out">Rupture</option>
          </select>

          {columnsPanel}

          {onResetFilters && hasActiveFilters ? (
            <button type="button" className="ans-at__tool" onClick={onResetFilters}>
              Réinitialiser
            </button>
          ) : null}

          {excelActions ? (
            <div className="orion-material-toolbar-excel flex items-center gap-1.5">
              {excelActions}
            </div>
          ) : null}

          {onOpenCorbeille ? (
            <button
              type="button"
              className="ans-at__tool"
              onClick={onOpenCorbeille}
              title="Voir les matières archivées"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Corbeille
            </button>
          ) : null}
        </div>

        {activePills.length > 0 ? (
          <div className="orion-material-toolbar-active-pills" role="group" aria-label="Filtres actifs">
            {activePills.map((p) => (
              <button
                key={p.key}
                type="button"
                className="orion-material-active-pill"
                onClick={p.clear}
                title={`Retirer — ${p.label}`}
              >
                {p.label}
                <X className="h-3 w-3" aria-hidden />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('orion-material-toolbar', masterMode && 'is-matieres-tarifs')}>
      <div className="orion-material-toolbar-row orion-material-toolbar-row-main">
        <div className="orion-material-toolbar-search-wrap">
          <Search className="orion-material-toolbar-search-icon" aria-hidden />
          <input
            ref={searchRef}
            type="search"
            className="orion-admin-table-search orion-material-toolbar-search"
            placeholder={
              masterMode
                ? 'Rechercher une matière, référence, famille, format…'
                : 'Recherche matière, grammage, SKU, référence…'
            }
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Recherche matières"
          />
          {search ? (
            <button
              type="button"
              className="orion-material-toolbar-search-clear"
              aria-label="Effacer la recherche"
              onClick={() => onSearchChange('')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <kbd className="orion-material-toolbar-kbd" title="Raccourci recherche">Ctrl K</kbd>
          )}
        </div>

        <select
          className="orion-material-toolbar-select"
          value={family}
          onChange={(e) => onFamilyChange(e.target.value)}
          aria-label="Catégorie"
        >
          {families.map((f) => (
            <option key={f} value={f}>
              {f === 'all' ? (masterMode ? 'Toutes catégories' : 'Toutes familles') : f}
            </option>
          ))}
        </select>

        <select
          className="orion-material-toolbar-select"
          value={sort}
          onChange={(e) => onSortChange(e.target.value as MaterialSortId)}
          aria-label="Tri"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>

        <span className="orion-material-toolbar-count" aria-live="polite">
          {count.toLocaleString('fr-FR')} résultat{count > 1 ? 's' : ''}
        </span>

        {columnsPanel}

        {onResetFilters && hasActiveFilters ? (
          <button type="button" className="orion-material-toolbar-btn" onClick={onResetFilters}>
            Réinitialiser
          </button>
        ) : null}

        {excelActions ? <div className="orion-material-toolbar-excel flex items-center gap-1.5">{excelActions}</div> : null}

        {onOpenCorbeille ? (
          <button
            type="button"
            className="orion-material-toolbar-btn mt-corbeille-btn"
            onClick={onOpenCorbeille}
            title="Voir les matières archivées"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Corbeille
          </button>
        ) : null}

        {masterMode && onDensityChange ? (
          <div className="mt-view-toggle" role="group" aria-label="Densité d’affichage">
            <button
              type="button"
              className={cn(density === 'comfortable' && 'is-active')}
              title="Vue confortable"
              onClick={() => onDensityChange('comfortable')}
            >
              ☷
            </button>
            <button
              type="button"
              className={cn(density === 'compact' && 'is-active')}
              title="Vue compacte"
              onClick={() => onDensityChange('compact')}
            >
              ≡
            </button>
          </div>
        ) : null}
      </div>

      {activePills.length > 0 ? (
        <div className="orion-material-toolbar-active-pills" role="group" aria-label="Filtres actifs">
          {activePills.map((p) => (
            <button
              key={p.key}
              type="button"
              className="orion-material-active-pill"
              onClick={p.clear}
              title={`Retirer — ${p.label}`}
            >
              {p.label}
              <X className="h-3 w-3" aria-hidden />
            </button>
          ))}
        </div>
      ) : null}

      {!masterMode ? (
        <div className="orion-material-toolbar-row orion-material-toolbar-row-chips">
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
      ) : null}
    </div>
  );
}

