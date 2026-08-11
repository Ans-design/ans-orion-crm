'use client';

import { useMemo, useState, type ReactNode, Fragment } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdminBulkSelectBar } from '@/components/admin/AdminBulkSelectBar';
import { AdminActionsColumnHeader } from '@/components/admin/AdminRowActions';

export type SmartColumn<T> = {
  id: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  /** high = toujours visible ; medium = caché &lt;768px ; low = caché &lt;1024px */
  priority?: 'high' | 'medium' | 'low';
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number | null;
};

type Props<T extends { id: string }> = {
  rows: T[];
  columns: SmartColumn<T>[];
  canEdit?: boolean;
  searchPlaceholder?: string;
  getSearchBlob?: (row: T) => string;
  filters?: ReactNode;
  rowActions?: (row: T) => ReactNode;
  expandable?: (row: T) => ReactNode | null;
  onBulkDelete?: (ids: string[]) => void | Promise<void>;
  emptyTitle?: string;
  className?: string;
  /** Densité d’affichage — compacte = padding réduit */
  density?: 'comfortable' | 'compact';
};

export function SmartDataGrid<T extends { id: string }>({
  rows,
  columns,
  canEdit = false,
  searchPlaceholder = 'Rechercher…',
  getSearchBlob,
  filters,
  rowActions,
  expandable,
  onBulkDelete,
  emptyTitle = 'Aucune ligne',
  className,
  density: densityProp,
}: Props<T>) {
  const [search, setSearch] = useState('');
  const [sortId, setSortId] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [densityLocal, setDensityLocal] = useState<'comfortable' | 'compact'>('comfortable');
  const density = densityProp ?? densityLocal;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows;
    if (q) {
      list = list.filter((row) => {
        const blob = (getSearchBlob?.(row) ?? JSON.stringify(row)).toLowerCase();
        return blob.includes(q);
      });
    }
    if (sortId) {
      const col = columns.find((c) => c.id === sortId);
      if (col?.sortValue) {
        list = [...list].sort((a, b) => {
          const va = col.sortValue!(a);
          const vb = col.sortValue!(b);
          if (va == null && vb == null) return 0;
          if (va == null) return 1;
          if (vb == null) return -1;
          if (va < vb) return sortDir === 'asc' ? -1 : 1;
          if (va > vb) return sortDir === 'asc' ? 1 : -1;
          return 0;
        });
      }
    }
    return list;
  }, [rows, search, getSearchBlob, sortId, sortDir, columns]);

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const someSelected = filtered.some((r) => selected.has(r.id));

  const toggleSort = (id: string) => {
    if (sortId === id) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortId(id);
      setSortDir('asc');
    }
  };

  const colSpan =
    columns.length + (canEdit ? 1 : 0) + (expandable ? 1 : 0) + (rowActions ? 1 : 0);

  return (
    <div
      className={cn('cps-smart-grid flex flex-col rounded-[7px] bg-[var(--cps-surface)]', className)}
      data-density={density}
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border-soft,transparent)] bg-transparent px-1 py-3 md:px-2">
        <div className="relative min-w-[min(100%,220px)] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--cps-muted)]" />
          <input
            type="search"
            className="cps-input pl-9 min-h-9"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={searchPlaceholder}
          />
        </div>
        {filters}
        {densityProp == null ? (
          <button
            type="button"
            className="rounded-[7px] border border-[var(--cps-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--cps-muted)] hover:text-[var(--cps-title)] hover:border-[var(--cps-accent,#FF174D)]"
            aria-pressed={density === 'compact'}
            aria-label={density === 'compact' ? 'Densité confortable' : 'Densité compacte'}
            onClick={() => setDensityLocal((d) => (d === 'compact' ? 'comfortable' : 'compact'))}
          >
            {density === 'compact' ? 'Confort' : 'Compact'}
          </button>
        ) : null}
        <span className="text-xs tabular-nums text-[var(--cps-muted)]">
          {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
        </span>
        {canEdit && onBulkDelete ? (
          <AdminBulkSelectBar
            allSelected={allSelected}
            someSelected={someSelected}
            onToggleAll={() => {
              if (allSelected) setSelected(new Set());
              else setSelected(new Set(filtered.map((r) => r.id)));
            }}
            selectedCount={selected.size}
            onDeleteSelected={() => void onBulkDelete([...selected])}
          />
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[var(--cps-surface-2)] text-[10px] font-semibold uppercase tracking-wider text-[var(--cps-muted)] backdrop-blur">
            <tr className="border-b border-[var(--border-soft,transparent)]">
              {canEdit ? (
                <th scope="col" className="w-10 px-3 py-3">
                  <span className="sr-only">Sélection</span>
                </th>
              ) : null}
              {expandable ? (
                <th scope="col" className="w-8 px-2 py-3">
                  <span className="sr-only">Détail</span>
                </th>
              ) : null}
              {columns.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  className={cn(
                    'px-3 py-3',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    col.sortable && 'cursor-pointer select-none hover:text-[var(--cps-title)]',
                    col.priority === 'medium' && 'cps-col-priority-medium',
                    col.priority === 'low' && 'cps-col-priority-low',
                    (!col.priority || col.priority === 'high') && 'cps-col-priority-high',
                  )}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={col.sortable ? () => toggleSort(col.id) : undefined}
                  aria-sort={
                    sortId === col.id ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined
                  }
                >
                  {col.header}
                  {sortId === col.id ? (sortDir === 'asc' ? ' ↑' : ' ↓') : null}
                </th>
              ))}
              {rowActions ? <AdminActionsColumnHeader /> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-soft,transparent)] text-[var(--cps-title)]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-12 text-center text-[var(--cps-muted)]">
                  {emptyTitle}
                </td>
              </tr>
            ) : (
              filtered.map((row) => {
                const isOpen = expanded.has(row.id);
                const detail = expandable?.(row) ?? null;
                return (
                  <Fragment key={row.id}>
                    <tr className="hover:bg-[color-mix(in_srgb,var(--cps-brand)_8%,var(--cps-surface))]">
                      {canEdit ? (
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={selected.has(row.id)}
                            onChange={() => {
                              setSelected((prev) => {
                                const next = new Set(prev);
                                if (next.has(row.id)) next.delete(row.id);
                                else next.add(row.id);
                                return next;
                              });
                            }}
                            aria-label="Sélectionner la ligne"
                          />
                        </td>
                      ) : null}
                      {expandable ? (
                        <td className="px-2 py-2.5">
                          {detail ? (
                            <button
                              type="button"
                              className="rounded p-0.5 text-[var(--cps-muted)] hover:bg-[var(--cps-surface-2)] hover:text-[var(--cps-title)]"
                              onClick={() => {
                                setExpanded((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(row.id)) next.delete(row.id);
                                  else next.add(row.id);
                                  return next;
                                });
                              }}
                            >
                              {isOpen ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          ) : null}
                        </td>
                      ) : null}
                      {columns.map((col) => (
                        <td
                          key={col.id}
                          className={cn(
                            'px-3 py-2.5',
                            col.align === 'right' && 'text-right tabular-nums',
                            col.align === 'center' && 'text-center',
                            col.priority === 'medium' && 'cps-col-priority-medium',
                            col.priority === 'low' && 'cps-col-priority-low',
                            (!col.priority || col.priority === 'high') && 'cps-col-priority-high',
                          )}
                        >
                          {col.render(row)}
                        </td>
                      ))}
                      {rowActions ? (
                        <td className="orion-admin-actions-td cps-col-priority-high px-3 py-2.5">
                          {rowActions(row)}
                        </td>
                      ) : null}
                    </tr>
                    {isOpen && detail ? (
                      <tr className="bg-[var(--cps-bg-soft)]">
                        <td colSpan={colSpan} className="px-4 py-3">
                          {detail}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
