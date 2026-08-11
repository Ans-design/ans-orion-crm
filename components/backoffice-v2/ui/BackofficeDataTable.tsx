'use client';

import { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { Columns3, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TableDensity = 'comfortable' | 'standard' | 'compact';

export type TableViewPreset = {
  id: string;
  label: string;
  columnVisibility: VisibilityState;
};

type Props<T> = {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  rowKey: (row: T) => string;
  viewPresets?: TableViewPreset[];
  defaultViewId?: string;
  density?: TableDensity;
  onDensityChange?: (d: TableDensity) => void;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  loading?: boolean;
  toolbarExtra?: React.ReactNode;
  rowClassName?: (row: T) => string | undefined;
};

const DENSITY_CLASS: Record<TableDensity, string> = {
  comfortable: 'is-comfortable',
  standard: '',
  compact: 'is-compact',
};

const VIEW_STORAGE_KEY = 'orion-admin-table-view';

export function BackofficeDataTable<T>({
  data,
  columns,
  rowKey,
  viewPresets = [],
  defaultViewId,
  density = 'standard',
  onDensityChange,
  onRowClick,
  emptyMessage = 'Aucune donnée',
  loading = false,
  toolbarExtra,
  rowClassName,
}: Props<T>) {
  const initialViewId = defaultViewId ?? viewPresets[0]?.id ?? 'all';

  const [sorting, setSorting] = useState<SortingState>([]);
  const [activeView, setActiveView] = useState(initialViewId);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    const preset = viewPresets.find((v) => v.id === initialViewId);
    return preset?.columnVisibility ?? {};
  });
  const [showColumns, setShowColumns] = useState(false);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => rowKey(row),
  });

  const visibleColumns = table.getAllColumns().filter((c) => c.getCanHide());

  const applyView = (viewId: string) => {
    setActiveView(viewId);
    const preset = viewPresets.find((v) => v.id === viewId);
    if (preset) setColumnVisibility(preset.columnVisibility);
    else setColumnVisibility({});
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, viewId);
    } catch {
      /* ignore */
    }
  };

  const densityOptions: TableDensity[] = ['comfortable', 'standard', 'compact'];

  return (
    <div className="orion-admin-table-root">
      <div className="orion-admin-table-toolbar-right" style={{ marginBottom: '0.65rem', justifyContent: 'flex-end' }}>
        {viewPresets.length > 0 && (
          <div className="orion-admin-table-view-tabs" role="tablist">
            {viewPresets.map((v) => (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={activeView === v.id}
                className={cn('orion-admin-table-view-tab', activeView === v.id && 'is-active')}
                onClick={() => applyView(v.id)}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}
        {toolbarExtra}
        {onDensityChange && (
          <select
            className="orion-admin-table-search"
            style={{ width: 'auto', minWidth: '7rem' }}
            value={density}
            onChange={(e) => onDensityChange(e.target.value as TableDensity)}
            aria-label="Densité"
          >
            {densityOptions.map((d) => (
              <option key={d} value={d}>
                {d === 'comfortable' ? 'Confort' : d === 'compact' ? 'Compact' : 'Standard'}
              </option>
            ))}
          </select>
        )}
        <div className="relative">
          <button
            type="button"
            className="orion-admin-table-chip"
            onClick={() => setShowColumns((v) => !v)}
          >
            <Columns3 className="inline h-3 w-3 mr-1" />
            Colonnes
          </button>
          {showColumns && (
            <div
              className="absolute right-0 top-full z-20 mt-1 min-w-[11rem] rounded-lg border p-2 shadow-lg"
              style={{ background: 'var(--oat-card)', borderColor: 'var(--oat-border)' }}
            >
              {visibleColumns.map((col) => (
                <label key={col.id} className="flex items-center gap-2 px-2 py-1 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={col.getIsVisible()}
                    onChange={col.getToggleVisibilityHandler()}
                  />
                  {typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id}
                </label>
              ))}
            </div>
          )}
        </div>
        <button type="button" className="orion-admin-table-chip" title="Export CSV">
          <Download className="inline h-3 w-3 mr-1" />
          Export
        </button>
      </div>

      {loading && (
        <div className="orion-admin-table-card orion-admin-table-skeleton">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="orion-admin-table-skeleton-line" style={{ width: `${70 + (i % 3) * 10}%` }} />
          ))}
        </div>
      )}

      {!loading && data.length === 0 && (
        <div className="orion-admin-table-card orion-admin-table-empty">{emptyMessage}</div>
      )}

      {!loading && data.length > 0 && (
        <div className={cn('orion-admin-table-card', DENSITY_CLASS[density])}>
          <div className="orion-admin-table-scroll">
            <table className="orion-admin-table ab2-dt-table">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id} className="table-header-row">
                    {hg.headers.map((header) => {
                      const meta = header.column.columnDef.meta as { headerClassName?: string } | undefined;
                      return (
                        <th
                          key={header.id}
                          className={cn(
                            meta?.headerClassName,
                            header.column.getCanSort() && 'cursor-pointer select-none',
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getIsSorted() === 'asc' && ' ↑'}
                          {header.column.getIsSorted() === 'desc' && ' ↓'}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      'table-row',
                      onRowClick && 'is-clickable',
                      rowClassName?.(row.original),
                    )}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta as { cellClassName?: string } | undefined;
                      return (
                        <td key={cell.id} className={cn('table-cell', meta?.cellClassName)}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function useArticleTableViews(): TableViewPreset[] {
  return useMemo((): TableViewPreset[] => [
    {
      id: 'essential',
      label: 'Essentiel',
      columnVisibility: {
        articleId: false,
        status: false,
        calculationType: false,
        qtyMin: false,
        tiersSummary: false,
        formulaStatus: false,
        prix2026Status: false,
      },
    },
    {
      id: 'pricing',
      label: 'Prix',
      columnVisibility: {
        family: false,
        stockLinked: false,
        visiblePos: false,
        tiersSummary: false,
        prix2026Status: false,
      },
    },
    {
      id: 'stock',
      label: 'Stock',
      columnVisibility: {
        prixBase: false,
        visiblePos: false,
        formulaStatus: false,
        tiersSummary: false,
        prix2026Status: false,
        calculationType: false,
      },
    },
    {
      id: 'pos',
      label: 'POS',
      columnVisibility: {
        prixBase: false,
        stockLinked: false,
        qtyMin: false,
        formulaStatus: false,
        tiersSummary: false,
        prix2026Status: false,
        calculationType: false,
      },
    },
    {
      id: 'anomalies',
      label: 'Anomalies',
      columnVisibility: {
        prixBase: false,
        qtyMin: false,
        tiersSummary: false,
        visiblePos: false,
        stockLinked: false,
        formulaStatus: false,
        prix2026Status: false,
        calculationType: false,
      },
    },
  ], []);
}
