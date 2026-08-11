'use client';

import type { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExcelTableActions } from '@/components/admin/excel-table-actions';
import type { DuplicateExcelIdGroup } from '@/lib/backoffice/material-excel-duplicate-ids';
import type { ExcelImportReport } from '@/lib/admin/excel-import-export';

export type AdminExcelImportHandler = (
  rows: Record<string, unknown>[],
  ctx?: { fileName?: string },
) => Promise<ExcelImportReport & {
  unchanged?: number;
  archived?: number;
  duplicateIds?: number;
  duplicateIdGroups?: DuplicateExcelIdGroup[];
  dbActive?: number;
  syncModeUsed?: 'full' | 'upsert';
  activeImported?: number;
  idsGenerated?: number;
  referencesGenerated?: number;
}>;

type ExcelProps = {
  fileStem: string;
  sheetName?: string;
  columns?: readonly string[];
  getExportRows: () => Record<string, unknown>[];
  canImport?: boolean;
  onBeforeExport?: () => Promise<void>;
  onImportRows?: AdminExcelImportHandler;
  validateRows?: (rows: Record<string, unknown>[]) => { ok: boolean; message?: string; materialColumn?: string };
};

type Props = {
  /** Filtres / recherche à gauche */
  filters?: ReactNode;
  /** Menu Actions (générer, sync, etc.) */
  actionsMenu?: ReactNode;
  /** Actualiser depuis la base */
  onRefresh?: () => void | Promise<void>;
  refreshLoading?: boolean;
  refreshTitle?: string;
  /** Import / export Excel */
  excel?: ExcelProps;
  className?: string;
};

/**
 * Barre d’actions standard Administration — modèle Stock & Matières.
 * Recherche/filtres à gauche · Excel + Actualiser à droite · Actions en slot dédié.
 */
export function AdminStandardTableToolbar({
  filters,
  actionsMenu,
  onRefresh,
  refreshLoading = false,
  refreshTitle = 'Actualiser depuis la base',
  excel,
  className,
}: Props) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {filters ? <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">{filters}</div> : null}

      <div className="flex flex-wrap items-center gap-2 ml-auto shrink-0">
        {actionsMenu}
        {excel ? (
          <ExcelTableActions
            fileStem={excel.fileStem}
            sheetName={excel.sheetName}
            columns={excel.columns}
            getExportRows={excel.getExportRows}
            canImport={excel.canImport}
            onBeforeExport={excel.onBeforeExport}
            onImportRows={excel.onImportRows}
            validateRows={excel.validateRows}
          />
        ) : null}
        {onRefresh ? (
          <button
            type="button"
            className="orion-material-toolbar-btn"
            title={refreshTitle}
            disabled={refreshLoading}
            onClick={() => void onRefresh()}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshLoading && 'animate-spin')} />
            Actualiser
          </button>
        ) : null}
      </div>
    </div>
  );
}
