import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';

export type OrionSimpleColumn<T> = {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  enableSorting?: boolean;
  sortingFn?: ColumnDef<T>['sortingFn'];
  accessorFn?: (row: T) => unknown;
  accessorKey?: keyof T & string;
};

export type OrionColumnMeta = {
  className?: string;
  headerClassName?: string;
};

export function toOrionColumnDefs<T>(columns: OrionSimpleColumn<T>[]): ColumnDef<T, unknown>[] {
  return columns.map((col) => ({
    id: col.id,
    accessorKey: col.accessorKey,
    accessorFn:
      col.accessorFn ??
      (col.accessorKey ? undefined : (row: T) => row[col.id as keyof T]),
    header: () => col.header,
    cell: ({ row }) => col.cell(row.original),
    enableSorting: col.enableSorting ?? false,
    sortingFn: col.sortingFn,
    meta: {
      className: col.className,
      headerClassName: col.headerClassName,
    } satisfies OrionColumnMeta,
  }));
}
