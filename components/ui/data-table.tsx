'use client';

import { OrionColumnTable } from '@/components/orion/orion-column-table';
import type { OrionSimpleColumn } from '@/lib/orion/table-columns';

export type DataTableColumn<T> = OrionSimpleColumn<T>;

type Props<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  empty?: React.ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
  enableSorting?: boolean;
};

/** @deprecated Préférer `OrionColumnTable` depuis `@/components/orion`. */
export function DataTable<T>(props: Props<T>) {
  return <OrionColumnTable {...props} />;
}
