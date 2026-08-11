import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from '@/components/ui/table';

export type OrionDataTableProps = React.ComponentProps<typeof Table> & {
  wrapClassName?: string;
};

/** Tableau stylé ORION — prêt pour TanStack Table en phase 6. */
export function OrionDataTable({ wrapClassName, className, ...props }: OrionDataTableProps) {
  return (
    <div className={cn('orion-ds-table-wrap', wrapClassName)}>
      <Table className={cn('orion-table', className)} {...props} />
    </div>
  );
}

export const OrionDataTableHeader = TableHeader;
export const OrionDataTableBody = TableBody;
export const OrionDataTableFooter = TableFooter;
export const OrionDataTableHead = TableHead;
export const OrionDataTableRow = TableRow;
export const OrionDataTableCell = TableCell;
export const OrionDataTableCaption = TableCaption;
