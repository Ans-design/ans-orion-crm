/**
 * Admin design system — alias vers composants Orion (plan §3.1).
 */
export {
  OrionPageHeader as PageHeader,
  OrionDataTable as AdminDataTable,
  OrionDataTableHeader as AdminDataTableHeader,
  OrionDataTableBody as AdminDataTableBody,
  OrionDataTableRow as AdminDataTableRow,
  OrionDataTableCell as AdminDataTableCell,
  OrionDataTableHead as AdminDataTableHead,
  OrionStatusBadge as StatusBadge,
  OrionConfirmDialog as ConfirmDeleteDialog,
  OrionEmptyState as EmptyState,
  OrionActionBar as SearchFilterToolbar,
} from '@/components/orion';

export { ExcelTableActions as ExcelImportExport } from '@/components/admin/excel-table-actions';
export { AdminStandardTableToolbar } from '@/components/admin/AdminStandardTableToolbar';
export { useAdminTableRefetch } from '@/hooks/useAdminTableRefetch';
export { ADMIN_EXCEL_MODULES } from '@/lib/admin/excel-import-export';
export type { ExcelImportReport, AdminExcelModule } from '@/lib/admin/excel-import-export';
export { ToggleSwitch } from './toggle-switch';
