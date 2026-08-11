'use client';

/**
 * Pont Excel Matières — toujours monté (header Admin Importer / Exporter).
 * Indépendant du lazy-load de la table.
 */
import { useCallback, useRef } from 'react';
import { ExcelTableActions } from '@/components/admin/excel-table-actions';
import {
  MATERIAL_TABLE_EXPORT_COLUMNS,
  materialRowToTableExport,
} from '@/lib/backoffice/material-excel-format';
import { validateMaterialExcelRows } from '@/lib/admin/excel-table';
import { getApiErrorMessage } from '@/lib/api-client';
import { uxToast } from '@/lib/ux/feedback';
import type { MaterialPriceUnifiedRow } from '@/components/backoffice-v2/pricing-custom/material-prices/types';
import type { DuplicateExcelIdGroup } from '@/lib/backoffice/material-excel-duplicate-ids';

type Props = {
  canEdit: boolean;
  onImported?: () => void;
};

export function MaterialsExcelBridge({ canEdit, onImported }: Props) {
  const rowsCache = useRef<MaterialPriceUnifiedRow[]>([]);

  const loadRows = useCallback(async () => {
    try {
      await fetch('/api/admin-backoffice/pricing/base-materials/excel-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'prepare-export' }),
      });
    } catch {
      /* non bloquant */
    }
    const r = await fetch('/api/admin-backoffice/pricing/base-material-prices', {
      cache: 'no-store',
    });
    const d = await r.json();
    if (!r.ok || !d.ok) {
      throw new Error(getApiErrorMessage(d, 'Lecture matières impossible'));
    }
    const raw = (d.data?.rows ?? []) as MaterialPriceUnifiedRow[];
    const rows = raw.filter(
      (row) =>
        ((row as { rowKind?: string }).rowKind ?? 'material') === 'material' &&
        !String(row.id ?? '').startsWith('print-') &&
        !String(row.id ?? '').startsWith('catalog-'),
    );
    rowsCache.current = rows;
    return rows;
  }, []);

  const onBeforeExport = useCallback(async () => {
    await loadRows();
  }, [loadRows]);

  const getExportRows = useCallback(() => {
    return rowsCache.current.map(
      (row) => materialRowToTableExport(row) as unknown as Record<string, unknown>,
    );
  }, []);

  const importRows = useCallback(
    async (incoming: Record<string, unknown>[], ctx?: { fileName?: string }) => {
      const r = await fetch('/api/admin-backoffice/pricing/base-material-prices/import-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: incoming,
          fileName: ctx?.fileName ?? 'import-ui.xlsx',
          syncMode: 'full',
          replaceAll: false,
        }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) {
        throw new Error(getApiErrorMessage(d, 'Import impossible'));
      }
      const report = d.data as {
        read: number;
        created: number;
        updated: number;
        unchanged: number;
        archived: number;
        ignored: number;
        errors: number;
        dbActive: number;
        activeImported?: number;
        duplicateIds: number;
        duplicateIdGroups?: DuplicateExcelIdGroup[];
        issues: Array<{ line: number; field?: string; reason: string }>;
      };

      try {
        const syncRes = await fetch('/api/admin-backoffice/pricing/sync-pos', { method: 'POST' });
        const syncJson = await syncRes.json().catch(() => ({}));
        if (!syncRes.ok || !syncJson.ok) {
          uxToast.info(
            'Matières importées — sync POS partielle : utilisez Sync POS pour finaliser.',
          );
        }
      } catch {
        uxToast.info('Matières importées — sync POS à relancer si nécessaire.');
      }

      onImported?.();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('orion-matieres-data-changed'));
      }
      return report;
    },
    [onImported],
  );

  return (
    <ExcelTableActions
      fileStem="matieres-tarifs"
      sheetName="Matières"
      columns={MATERIAL_TABLE_EXPORT_COLUMNS}
      importMode="full"
      onBeforeExport={onBeforeExport}
      getExportRows={getExportRows}
      canImport={canEdit}
      onImportRows={canEdit ? importRows : undefined}
      importTriggerEvent="orion-matieres-excel-import"
      exportTriggerEvent="orion-matieres-excel-export"
      validateRows={validateMaterialExcelRows}
      hiddenUi
    />
  );
}
