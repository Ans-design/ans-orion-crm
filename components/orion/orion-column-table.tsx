'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import { useWindowedRows } from '@/lib/hooks/use-windowed-rows';
import {
  toOrionColumnDefs,
  type OrionColumnMeta,
  type OrionSimpleColumn,
} from '@/lib/orion/table-columns';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export type { OrionSimpleColumn };

export type OrionColumnTableProps<T> = {
  columns: OrionSimpleColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
  wrapClassName?: string;
  enableSorting?: boolean;
  virtualizeThreshold?: number;
  rowHeight?: number;
  maxHeightClassName?: string;
};

function SortIndicator({ direction }: { direction: false | 'asc' | 'desc' }) {
  if (!direction) return <span className="text-[var(--text-muted)] opacity-40 ml-1">↕</span>;
  return <span className="ml-1 text-[var(--primary)]">{direction === 'asc' ? '↑' : '↓'}</span>;
}

/** Tableau colonnes ORION — TanStack Table + virtualisation fenêtrée (≥60 lignes). */
export function OrionColumnTable<T>({
  columns,
  data,
  rowKey,
  empty,
  onRowClick,
  className,
  wrapClassName,
  enableSorting = false,
  virtualizeThreshold = 60,
  rowHeight = 48,
  maxHeightClassName = 'max-h-[70vh]',
}: OrionColumnTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const columnDefs = useMemo(() => toOrionColumnDefs(columns), [columns]);

  const table = useReactTable({
    data,
    columns: columnDefs,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => rowKey(row),
    ...(enableSorting
      ? {
          state: { sorting },
          onSortingChange: setSorting,
          getSortedRowModel: getSortedRowModel(),
        }
      : {}),
  });

  const allRows = table.getRowModel().rows;
  const { windowRows, topSpacerPx, bottomSpacerPx, virtualized } = useWindowedRows(
    allRows,
    scrollRef,
    rowHeight,
    virtualizeThreshold,
  );

  if (data.length === 0 && empty) return <>{empty}</>;

  return (
    <div
      ref={scrollRef}
      className={cn('orion-ds-table-wrap overflow-auto', maxHeightClassName, wrapClassName)}
    >
      <table className={cn('w-full caption-bottom text-sm', className)}>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const meta = header.column.columnDef.meta as OrionColumnMeta | undefined;
                const canSort = enableSorting && header.column.getCanSort();
                return (
                  <TableHead
                    key={header.id}
                    className={cn(meta?.headerClassName, canSort && 'cursor-pointer select-none')}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                  >
                    <span className="inline-flex items-center">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {canSort && <SortIndicator direction={header.column.getIsSorted()} />}
                    </span>
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {virtualized && topSpacerPx > 0 && (
            <TableRow aria-hidden className="hover:bg-transparent border-none">
              <TableCell
                colSpan={columns.length}
                style={{ height: topSpacerPx, padding: 0, border: 'none' }}
              />
            </TableRow>
          )}
          {windowRows.map((row) => (
            <TableRow
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              className={onRowClick ? 'cursor-pointer' : undefined}
            >
              {row.getVisibleCells().map((cell) => {
                const meta = cell.column.columnDef.meta as OrionColumnMeta | undefined;
                return (
                  <TableCell key={cell.id} className={meta?.className}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
          {virtualized && bottomSpacerPx > 0 && (
            <TableRow aria-hidden className="hover:bg-transparent border-none">
              <TableCell
                colSpan={columns.length}
                style={{ height: bottomSpacerPx, padding: 0, border: 'none' }}
              />
            </TableRow>
          )}
        </TableBody>
      </table>
    </div>
  );
}
