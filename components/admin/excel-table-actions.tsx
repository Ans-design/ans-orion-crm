'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import {
  exportRowsToXlsx,
  parseXlsxFile,
  validateMaterialExcelRows,
} from '@/lib/admin/excel-table';
import {
  detectDuplicateExcelIds,
  formatDuplicateExcelIdGroup,
  type DuplicateExcelIdGroup,
} from '@/lib/backoffice/material-excel-duplicate-ids';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

type Props = {
  /** Nom fichier : ans-orion-{fileStem}-YYYY-MM-DD.xlsx */
  fileStem: string;
  sheetName?: string;
  /** Si fourni : export générique (pas colonnes matières). */
  columns?: readonly string[];
  getExportRows: () => Record<string, unknown>[];
  /** Remplace l’export générique (ex. multi-feuilles Articles finis). */
  onCustomExport?: () => void | Promise<void>;
  canImport?: boolean;
  onBeforeExport?: () => Promise<void>;
  /** Validation fichier avant import — défaut : matières */
  /** Mode import affiché dans la confirmation — full = remplacement complet (matières) */
  importMode?: 'full' | 'upsert';
  /** Écoute un CustomEvent window pour ouvrir le sélecteur (ex. bouton AdminHeader). */
  importTriggerEvent?: string;
  /** Écoute un CustomEvent window pour lancer l’export (ex. bouton AdminHeader Exporter). */
  exportTriggerEvent?: string;
  /** Masque les boutons (import/export déclenchés ailleurs). */
  hiddenUi?: boolean;
  validateRows?: (rows: Record<string, unknown>[]) => {
    ok: boolean;
    message?: string;
    materialColumn?: string;
  };
  onImportRows?: (
    rows: Record<string, unknown>[],
    ctx?: { fileName?: string; file?: File },
  ) => Promise<{
    read?: number;
    created: number;
    updated: number;
    unchanged?: number;
    archived?: number;
    duplicateIds?: number;
    duplicateIdGroups?: DuplicateExcelIdGroup[];
    dbActive?: number;
    syncModeUsed?: 'full' | 'upsert';
    idsGenerated?: number;
    referencesGenerated?: number;
    activeImported?: number;
    ignored: number;
    errors: number;
    issues?: Array<{ line: number; field?: string; reason: string }>;
  }>;
};

export function ExcelTableActions({
  fileStem,
  sheetName = 'Données',
  columns,
  getExportRows,
  onCustomExport,
  canImport = false,
  onBeforeExport,
  importMode = 'upsert',
  importTriggerEvent,
  exportTriggerEvent,
  hiddenUi = false,
  validateRows: validateRowsProp,
  onImportRows,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const importPayloadRef = useRef<{
    rows: Record<string, unknown>[];
    fileName: string | null;
    file: File | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Record<string, unknown>[] | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);
  const [previewHint, setPreviewHint] = useState<string | null>(null);
  const [previewDuplicates, setPreviewDuplicates] = useState<DuplicateExcelIdGroup[]>([]);

  const onExport = useCallback(async () => {
    setBusy(true);
    try {
      if (onBeforeExport) await onBeforeExport();
      if (onCustomExport) {
        await onCustomExport();
        return;
      }
      const rows = getExportRows();
      if (!rows.length) {
        uxToast.error('Aucune ligne à exporter');
        return;
      }
      const { exportGenericRowsToXlsx } = await import('@/lib/admin/excel-table');
      if (columns?.length) {
        exportGenericRowsToXlsx(rows, columns, fileStem, sheetName);
      } else {
        exportRowsToXlsx(rows, fileStem, sheetName);
      }
      uxToast.success(`${rows.length} ligne(s) exportée(s)`);
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Export impossible');
    } finally {
      setBusy(false);
    }
  }, [onBeforeExport, onCustomExport, getExportRows, columns, fileStem, sheetName]);

  useEffect(() => {
    if (!importTriggerEvent || !canImport || !onImportRows) return;
    const open = () => inputRef.current?.click();
    window.addEventListener(importTriggerEvent, open);
    return () => window.removeEventListener(importTriggerEvent, open);
  }, [importTriggerEvent, canImport, onImportRows]);

  useEffect(() => {
    if (!exportTriggerEvent) return;
    const run = () => {
      void onExport();
    };
    window.addEventListener(exportTriggerEvent, run);
    return () => window.removeEventListener(exportTriggerEvent, run);
  }, [exportTriggerEvent, onExport]);

  const onFile = async (file: File | undefined) => {
    if (!file || !onImportRows) return;
    setBusy(true);
    try {
      const rows = await parseXlsxFile(file);
      const validation = columns?.length
        ? (validateRowsProp ?? ((r) => ({
            ok: r.length > 0,
            message: r.length ? undefined : 'Fichier Excel vide',
          })))(rows)
        : (validateRowsProp ?? validateMaterialExcelRows)(rows);
      if (!validation.ok) {
        uxToast.error(validation.message ?? 'Fichier Excel non reconnu');
        return;
      }
      importPayloadRef.current = { rows, fileName: file.name, file };
      const duplicateGroups = detectDuplicateExcelIds(rows);
      setPreviewDuplicates(duplicateGroups);
      setPreview(rows);
      setPreviewFileName(file.name);
      setPreviewHint(
        `${rows.length} ligne(s) · colonne matière : « ${
          'materialColumn' in validation && validation.materialColumn
            ? validation.materialColumn
            : '—'
        } »`,
      );
      if (duplicateGroups.length > 0) {
        const conflicts = duplicateGroups.filter((g) => g.hasConflictingMaterials).length;
        const detail = duplicateGroups.map(formatDuplicateExcelIdGroup).join(' — ');
        if (conflicts > 0) {
          uxToast.error(
            `${duplicateGroups.length} ID(s) en doublon — ${conflicts} avec matières différentes. Corrigez l’Excel avant import : ${detail}`,
          );
        } else {
          uxToast.info(
            `⚠ ${duplicateGroups.length} ID(s) en doublon détecté(s). Seule la 1ère ligne de chaque ID sera importée : ${detail}`,
          );
        }
      }
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Lecture Excel impossible');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const confirmImport = async () => {
    const payload = importPayloadRef.current;
    if (!payload?.rows.length || !onImportRows) return;
    setBusy(true);
    try {
      const report = await onImportRows(payload.rows, {
        fileName: payload.fileName ?? undefined,
        file: payload.file ?? undefined,
      });
      const read = report.read ?? payload.rows.length;
      const applied = report.created + report.updated + (report.archived ?? 0);

      if (applied === 0 && report.unchanged === read) {
        uxToast.error(
          'Aucune modification appliquée — données identiques à la base ou IDs dupliqués dans le fichier.',
        );
      } else if (applied === 0 && (report.ignored > 0 || report.errors > 0)) {
        const sample = report.issues?.slice(0, 4).map((i) => `L${i.line}: ${i.reason}`).join(' · ') ?? '';
        uxToast.error(
          `Import incomplet — ${report.ignored} ignorée(s), ${report.errors} erreur(s). ${sample}`,
        );
      } else if (
        read > 0 &&
        report.activeImported != null &&
        report.activeImported < read - (report.ignored ?? 0) - (report.errors ?? 0)
      ) {
        uxToast.info(
          `${read} lignes lues · ${report.activeImported} actives en base — vérifiez les lignes ignorées ou en erreur.`,
        );
      } else {
        const detail =
          report.errors > 0 || report.ignored > 0
            ? ` (${report.errors} erreur(s), ${report.ignored} ignorée(s))`
            : '';
        const archived = report.archived ? ` · archivées: ${report.archived}` : '';
        const unchanged = report.unchanged ? ` · inchangées: ${report.unchanged}` : '';
        const dbTotal = report.dbActive != null ? ` · total actif: ${report.dbActive}` : '';
        const dupes = report.duplicateIds ? ` · IDs dupliqués ignorés: ${report.duplicateIds}` : '';
        const idsGen = report.idsGenerated ? ` · IDs générés: ${report.idsGenerated}` : '';
        const refsGen = report.referencesGenerated ? ` · références générées: ${report.referencesGenerated}` : '';
        const modeHint =
          report.syncModeUsed === 'upsert' ? ' · mode partiel' : ' · remplacement complet';
        const activeImported = report.activeImported ?? report.dbActive;
        uxToast.success(
          `Import terminé — lues: ${read} · importées actives: ${activeImported ?? '—'} · créées: ${report.created} · MAJ: ${report.updated}${unchanged}${archived}${dbTotal}${dupes}${idsGen}${refsGen}${modeHint}${detail}`,
        );
      }

      if (report.duplicateIdGroups?.length) {
        for (const group of report.duplicateIdGroups) {
          if (group.hasConflictingMaterials) {
            uxToast.error(formatDuplicateExcelIdGroup(group));
          } else {
            uxToast.info(`⚠ ${formatDuplicateExcelIdGroup(group)}`);
          }
        }
      } else if (report.duplicateIds && report.duplicateIds > 0) {
        uxToast.info(
          `⚠ ${report.duplicateIds} ligne(s) ignorée(s) : même ID en double. Gardez une seule ligne par ID (la 1ère en haut est appliquée).`,
        );
      }
      if (report.issues?.length) {
        const dupIssues = report.issues.filter((i) => i.field === 'ID');
        const otherIssues = report.issues.filter((i) => i.field !== 'ID');
        if (dupIssues.length > 0 && !report.duplicateIdGroups?.length) {
          const sample = dupIssues.slice(0, 5).map((i) => `L${i.line}: ${i.reason}`).join(' · ');
          uxToast.info(sample);
        }
        if (otherIssues.length > 0) {
          const sample = otherIssues.slice(0, 3).map((i) => `L${i.line}: ${i.reason}`).join(' · ');
          uxToast.info(sample);
        }
      }
      setPreview(null);
      setPreviewFileName(null);
      setPreviewHint(null);
      setPreviewDuplicates([]);
      importPayloadRef.current = null;
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Import impossible');
    } finally {
      setBusy(false);
    }
  };

  const closePreview = () => {
    setPreview(null);
    setPreviewFileName(null);
    setPreviewHint(null);
    setPreviewDuplicates([]);
    importPayloadRef.current = null;
  };

  return (
    <>
      {!hiddenUi ? (
        <button type="button" className="orion-material-toolbar-btn" onClick={() => void onExport()} title="Exporter Excel">
          <Download className="h-3.5 w-3.5" />
          Exporter Excel
        </button>
      ) : null}
      {canImport && onImportRows ? (
        <>
          {!hiddenUi ? (
            <button
              type="button"
              className="orion-material-toolbar-btn"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              title="Importer Excel"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Importer Excel
            </button>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </>
      ) : null}

      <ConfirmDialog
        open={Boolean(preview)}
        onOpenChange={(open) => {
          if (!open && !busy) closePreview();
        }}
        title="Confirmer l’import Excel"
        description={
          preview
            ? [
                `Fichier : ${previewFileName ?? 'Excel'} — ${previewHint ?? `${preview.length} ligne(s)`}.`,
                importMode === 'full'
                  ? 'Excel = source de vérité : toutes les colonnes du fichier mettent à jour la base (prix, matières, stocks liés, statut…). Après import, le tableau reflète le fichier. Les matières absentes du fichier iront en Corbeille si le mode remplacement est actif (restaurables).'
                  : 'Mise à jour complète des lignes présentes : chaque colonne Excel écrase la valeur en base (ID / référence). Aucune suppression automatique des absents.',
                previewDuplicates.length > 0
                  ? `⚠ ID en doublon (${previewDuplicates.length}) : ${previewDuplicates.map(formatDuplicateExcelIdGroup).join(' — ')}`
                  : null,
              ]
                .filter(Boolean)
                .join('\n\n')
            : undefined
        }
        confirmLabel={busy ? 'Import…' : 'Importer'}
        cancelLabel="Annuler"
        onConfirm={async () => {
          await confirmImport();
        }}
      />
      {preview ? (
        <div className="sr-only" aria-hidden>
          <FileSpreadsheet />
        </div>
      ) : null}
    </>
  );
}
