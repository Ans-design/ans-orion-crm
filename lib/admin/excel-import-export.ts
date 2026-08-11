/**
 * Framework import/export Excel Admin — registre modules.
 */
export {
  exportRowsToXlsx,
  parseXlsxFile,
} from '@/lib/admin/excel-table';

export type ExcelImportReport = {
  read?: number;
  created: number;
  updated: number;
  unchanged?: number;
  archived?: number;
  ignored: number;
  errors: number;
  duplicateIds?: number;
  dbActive?: number;
  syncModeUsed?: 'full' | 'upsert';
  activeImported?: number;
  issues?: Array<{ line: number; field?: string; reason: string }>;
};

export type AdminExcelImportMode = 'full' | 'upsert' | 'export-only';

export type AdminExcelModule = {
  id: string;
  label: string;
  fileStem: string;
  mode: AdminExcelImportMode;
  importEndpoint?: string;
  prepareExportEndpoint?: string;
};

/** Modules Administration — import/export Excel */
export const ADMIN_EXCEL_MODULES: AdminExcelModule[] = [
  {
    id: 'materials',
    label: 'Stock & Matières',
    fileStem: 'stock-matieres',
    mode: 'full',
    importEndpoint: '/api/admin-backoffice/pricing/base-material-prices/import-excel',
    prepareExportEndpoint: '/api/admin-backoffice/pricing/base-materials/excel-metadata',
  },
  {
    id: 'chips',
    label: 'Options / Chips',
    fileStem: 'options-chips',
    mode: 'upsert',
    importEndpoint: '/api/admin-backoffice/options/chips/import-excel',
    prepareExportEndpoint: '/api/admin-backoffice/options/chips/import-excel',
  },
  {
    id: 'production-flux',
    label: 'Production & Flux',
    fileStem: 'production-flux',
    mode: 'upsert',
    importEndpoint: '/api/admin-backoffice/production-flux/import-excel',
  },
  {
    id: 'pricing-articles',
    label: 'Prix & Calculs',
    fileStem: 'prix-calculs',
    mode: 'upsert',
    importEndpoint: '/api/admin-backoffice/pricing/articles/import-excel',
  },
  {
    id: 'tiers',
    label: 'Paliers / Remises',
    fileStem: 'paliers-remises',
    mode: 'upsert',
    importEndpoint: '/api/admin-backoffice/tiers/import-excel',
  },
  {
    id: 'audit',
    label: 'Audit log',
    fileStem: 'audit-log',
    mode: 'export-only',
  },
  {
    id: 'anomalies',
    label: 'Anomalies tarif',
    fileStem: 'anomalies-tarif',
    mode: 'export-only',
  },
  {
    id: 'article-templates',
    label: 'Modèles articles',
    fileStem: 'modeles-articles',
    mode: 'export-only',
  },
  {
    id: 'catalogue',
    label: 'Catalogue & POS',
    fileStem: 'catalogue-pos',
    mode: 'upsert',
    importEndpoint: '/api/admin-backoffice/catalogue-pos/import-excel',
    prepareExportEndpoint: '/api/admin-backoffice/catalogue-pos/import-excel',
  },
  {
    id: 'users',
    label: 'Utilisateurs',
    fileStem: 'utilisateurs',
    mode: 'export-only',
  },
  {
    id: 'permissions',
    label: 'Permissions',
    fileStem: 'permissions',
    mode: 'upsert',
    importEndpoint: '/api/admin/permissions/import-excel',
  },
  {
    id: 'suppliers',
    label: 'Fournisseurs',
    fileStem: 'fournisseurs',
    mode: 'upsert',
    importEndpoint: '/api/admin-backoffice/suppliers/import-excel',
    prepareExportEndpoint: '/api/admin-backoffice/suppliers/import-excel',
  },
  {
    id: 'business-rules',
    label: 'Règles métier',
    fileStem: 'regles-metier',
    mode: 'upsert',
    importEndpoint: '/api/admin-backoffice/regles/import-excel',
    prepareExportEndpoint: '/api/admin-backoffice/regles/import-excel',
  },
  {
    id: 'variables',
    label: 'Variables globales',
    fileStem: 'variables-globales',
    mode: 'upsert',
    importEndpoint: '/api/admin-backoffice/pricing/variables/import-excel',
  },
  {
    id: 'annexes',
    label: 'Annexes & sites',
    fileStem: 'annexes-sites',
    mode: 'upsert',
    importEndpoint: '/api/admin-backoffice/annexes/import-excel',
    prepareExportEndpoint: '/api/admin-backoffice/annexes/import-excel',
  },
  {
    id: 'sync-diagnostics',
    label: 'Sync diagnostics',
    fileStem: 'sync-diagnostics',
    mode: 'export-only',
  },
  {
    id: 'carriers',
    label: 'Transporteurs',
    fileStem: 'transporteurs',
    mode: 'upsert',
    importEndpoint: '/api/logistics/carriers/import-excel',
    prepareExportEndpoint: '/api/logistics/carriers/import-excel',
  },
];

export { ENTITY_EXCEL_MODULES, getEntityExcelModule } from '@/lib/crm/entity-excel-modules';
