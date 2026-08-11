'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { uxToast } from '@/lib/ux/feedback';
import { formatPrice } from '@/lib/data/catalogue';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AppButton } from '@/components/ui/app-ui';
import { LoadingState } from '@/components/ui/loading-state';
import { AdminTableViewTabs } from '@/components/admin/AdminTableViewTabs';
import { AdminHistoriquePlaceholder } from '@/components/admin/AdminHistoriquePlaceholder';
import { AdminRowActions } from '@/components/admin/AdminRowActions';
import { AdminStandardTableToolbar } from '@/components/admin/AdminStandardTableToolbar';
import {
  InlineEditableCell,
  MarginIndicator,
  computeMarginPct,
  SmartDataGrid,
  type SmartColumn,
} from '@/components/admin/catalogue-prix-stock';
import {
  finishingToExcelRow,
  grandFormatToExcelRow,
  designToExcelRow,
} from '@/lib/backoffice/pricing-tables-excel-format';
import '@/components/backoffice-v2/admin-backoffice.css';

type Row = Record<string, unknown> & { id: string };

type ViewTab = 'liste' | 'corbeille' | 'historique';

const VIEW_TABS = [
  { id: 'liste' as const, label: 'Liste' },
  { id: 'corbeille' as const, label: 'Corbeille' },
  { id: 'historique' as const, label: 'Historique' },
];

type Props = {
  title: string;
  description: string;
  apiPath: string;
  excelColumns: readonly string[];
  excelSheetName: string;
  exportFileStem: string;
  nameKey: string;
  priceKey: string;
  canEdit: boolean;
  /** Affiche « Compléter depuis POS » (seed/backfill Admin ← catalogue POS). */
  enableBackfillFromPos?: boolean;
  backfillLabel?: string;
};

export function PriceTableWorkspace({
  title,
  description,
  apiPath,
  excelColumns,
  excelSheetName,
  exportFileStem,
  nameKey,
  priceKey,
  canEdit,
  enableBackfillFromPos = false,
  backfillLabel = 'Compléter depuis POS',
}: Props) {
  const [view, setView] = useState<ViewTab>('liste');
  const [rows, setRows] = useState<Row[]>([]);
  const [archivedRows, setArchivedRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [pendingBulkIds, setPendingBulkIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(apiPath, { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Chargement impossible');
      const all = (d.data.rows ?? []) as Row[];
      setRows(all.filter((row) => row.status !== 'archived' && row.active !== false));
      setArchivedRows(all.filter((row) => row.status === 'archived' || row.active === false));
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [apiPath]);

  useEffect(() => {
    void load();
  }, [load]);

  const displayRows = view === 'corbeille' ? archivedRows : rows;

  const syncAll = async () => {
    setSyncing(true);
    try {
      const r = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync-all' }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Sync impossible');
      uxToast.success(`${d.data.synced ?? 0} ligne(s) synchronisée(s) vers POS`);
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur sync');
    } finally {
      setSyncing(false);
    }
  };

  const backfillFromPos = async () => {
    setBackfilling(true);
    try {
      const r = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed-from-pos', syncPos: true }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? d.data?.message ?? 'Backfill impossible');
      const report = d.data?.report ?? {};
      uxToast.success(
        d.data?.message
          ?? `${report.created ?? 0} créée(s), ${report.preserved ?? 0} conservée(s)`,
      );
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur backfill');
    } finally {
      setBackfilling(false);
    }
  };

  const updatePrice = useCallback(async (id: string, price: number) => {
    try {
      const r = await fetch(`${apiPath}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [priceKey]: price, action: 'sync' }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'MAJ impossible');
      uxToast.success('Prix mis à jour et synchronisé POS');
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
      throw e;
    }
  }, [apiPath, priceKey, load]);

  const publish = async (id: string) => {
    try {
      const r = await fetch(`${apiPath}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish', status: 'published' }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Publication impossible');
      uxToast.success('Publié et synchronisé POS');
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const archive = async (id: string) => {
    try {
      const r = await fetch(`${apiPath}/${id}`, { method: 'DELETE' });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Archivage impossible');
      uxToast.success('Déplacé vers la corbeille');
      setArchiveId(null);
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const deleteSelected = async () => {
    if (!canEdit || pendingBulkIds.length === 0) return;
    try {
      for (const id of pendingBulkIds) {
        await fetch(`${apiPath}/${id}`, { method: 'DELETE' });
      }
      uxToast.success(`${pendingBulkIds.length} ligne(s) archivée(s)`);
      setPendingBulkIds([]);
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Suppression impossible');
    } finally {
      setBulkDeleteOpen(false);
    }
  };

  const columns: SmartColumn<Row>[] = useMemo(
    () => [
      {
        id: 'excelId',
        header: 'ID',
        priority: 'medium',
        sortable: true,
        sortValue: (row) => String(row.excelId ?? ''),
        render: (row) => (
          <span className="font-mono text-xs text-gray-600">{String(row.excelId ?? '—')}</span>
        ),
      },
      {
        id: 'label',
        header: 'Libellé',
        priority: 'high',
        sortable: true,
        sortValue: (row) => String(row[nameKey] ?? row.name ?? ''),
        render: (row) => (
          <span className="font-medium text-gray-900">
            {String(row[nameKey] ?? row.name ?? '')}
          </span>
        ),
      },
      {
        id: 'ref',
        header: 'Réf.',
        priority: 'low',
        render: (row) => (
          <span className="font-mono text-xs text-gray-500">{String(row.reference ?? '—')}</span>
        ),
      },
      {
        id: 'price',
        header: 'Prix',
        priority: 'high',
        align: 'right',
        sortable: true,
        sortValue: (row) => Number(row[priceKey] ?? row.unitPrice ?? 0),
        render: (row) => {
          const raw = row[priceKey] ?? row.unitPrice;
          const price = raw == null || raw === '' ? 0 : Number(raw);
          const cost = Number(row.costHT ?? row.purchasePrice ?? 0);
          const needsPrice =
            !(price > 0) ||
            String(row.status ?? '') === 'a_completer' ||
            String(row.status ?? '') === 'a_verifier';
          return (
            <div className="flex flex-col items-end gap-1">
              {needsPrice && !(price > 0) ? (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                  À compléter
                </span>
              ) : null}
              <InlineEditableCell
                type="number"
                value={price > 0 ? price : 0}
                canEdit={canEdit && view === 'liste'}
                displayClassName="font-mono text-xs tabular-nums"
                formatDisplay={(v) => {
                  const n = Number(v);
                  if (!(n > 0)) return '—';
                  return `${formatPrice(n)} Ar`;
                }}
                onSave={async (next) => {
                  const n = Number(next);
                  if (!(n > 0)) throw new Error('Prix invalide');
                  await updatePrice(row.id, n);
                }}
              />
              {cost > 0 && price > 0 ? (
                <MarginIndicator marginPct={computeMarginPct(price, cost)} showBar={false} />
              ) : null}
            </div>
          );
        },
      },
      {
        id: 'pos',
        header: 'POS',
        priority: 'medium',
        align: 'center',
        render: (row) => (
          <span className="text-xs font-semibold text-gray-600">
            {row.visiblePOS ? 'Oui' : 'Non'}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Statut',
        priority: 'high',
        align: 'center',
        render: (row) => {
          const st = String(row.status ?? (row.active ? 'published' : 'draft'));
          if (st === 'a_completer' || st === 'a_verifier') {
            return (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                Prix à compléter
              </span>
            );
          }
          return <span className="text-xs text-gray-600">{st}</span>;
        },
      },
    ],
    [canEdit, nameKey, priceKey, view, updatePrice],
  );

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-xl font-bold text-gray-900">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">{description}</p>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            {enableBackfillFromPos ? (
              <AppButton
                type="button"
                variant="outline"
                disabled={backfilling || syncing}
                onClick={() => void backfillFromPos()}
              >
                {backfilling ? 'Complétion…' : backfillLabel}
              </AppButton>
            ) : null}
            <AppButton
              type="button"
              variant="default"
              disabled={syncing || backfilling}
              onClick={() => void syncAll()}
            >
              Sync POS
            </AppButton>
          </div>
        ) : null}
      </header>

      <AdminTableViewTabs
        tabs={VIEW_TABS}
        value={view}
        onChange={(id) => setView(id)}
        ariaLabel={`Navigation ${title}`}
      />

      {view === 'historique' ? (
        <AdminHistoriquePlaceholder entityLabel={title.toLowerCase()} />
      ) : (
        <>
          <AdminStandardTableToolbar
            onRefresh={() => void load()}
            refreshLoading={loading}
            excel={{
              fileStem: exportFileStem,
              sheetName: excelSheetName,
              columns: excelColumns,
              getExportRows: () =>
                displayRows.map((row) => {
                  if (excelColumns.includes('FINITION')) {
                    return finishingToExcelRow({
                      excelId: (row.excelId as string) ?? null,
                      name: String(row[nameKey] ?? row.name ?? ''),
                      category: String(row.category ?? ''),
                      compatibleFamilies: (row.compatibleFamilies as string) ?? null,
                      unit: String(row.unit ?? 'pièce'),
                      unitPrice: Number(row[priceKey] ?? row.unitPrice ?? 0),
                      minQuantity: Number(row.minQuantity ?? 1),
                      formulaType: String(row.formulaType ?? 'fixed'),
                      visiblePOS: row.visiblePOS !== false,
                      active: row.active !== false,
                      reference: (row.reference as string) ?? null,
                      details: (row.details as string) ?? null,
                      status: String(row.status ?? 'published'),
                    });
                  }
                  if (excelColumns.includes('PRESTATION')) {
                    return designToExcelRow({
                      excelId: (row.excelId as string) ?? null,
                      name: String(row[nameKey] ?? row.name ?? ''),
                      category: String(row.category ?? ''),
                      serviceType: (row.serviceType as string) ?? null,
                      unit: String(row.unit ?? 'prestation'),
                      unitPrice: Number(row[priceKey] ?? row.unitPrice ?? 0),
                      estimatedTime: (row.estimatedTime as string) ?? null,
                      revisionIncluded: Number(row.revisionIncluded ?? 0),
                      visiblePOS: row.visiblePOS !== false,
                      active: row.active !== false,
                      reference: (row.reference as string) ?? null,
                      details: (row.details as string) ?? null,
                    });
                  }
                  if (excelColumns.includes('PRIX M²') || excelColumns.includes('PRIX / M²')) {
                    try {
                      return grandFormatToExcelRow(
                        row as unknown as Parameters<typeof grandFormatToExcelRow>[0],
                      );
                    } catch {
                      /* fallthrough */
                    }
                  }
                  const out: Record<string, unknown> = {};
                  for (const col of excelColumns) out[col] = row[col] ?? '';
                  return out;
                }),
              canImport: canEdit && view === 'liste',
              validateRows: (parsed) => {
                if (!parsed.length) return { ok: false, message: 'Fichier Excel vide' };
                if (excelColumns.includes('FINITION')) {
                  const has = parsed.some((r) =>
                    Object.keys(r).some((k) => /finition|libell|prix/i.test(k)),
                  );
                  return {
                    ok: has,
                    message: has ? undefined : 'Colonnes Finitions attendues (FINITION / PRIX)',
                  };
                }
                return { ok: true };
              },
              onImportRows: async (parsed) => {
                const r = await fetch(`${apiPath}/import-excel`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ rows: parsed }),
                });
                const d = await r.json();
                if (!r.ok || !d.ok) {
                  return { created: 0, updated: 0, ignored: 0, errors: 1 };
                }
                void load();
                return {
                  created: d.data?.created ?? 0,
                  updated: d.data?.updated ?? 0,
                  ignored: 0,
                  errors: d.data?.errors ?? 0,
                };
              },
            }}
          />

          <p className="text-[10px] text-gray-500">{excelColumns.join(' · ')}</p>

          {loading ? (
            <LoadingState message="Chargement…" size="sm" />
          ) : displayRows.length === 0 && view === 'liste' && enableBackfillFromPos ? (
            <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/60 px-6 py-10 text-center">
              <p className="text-sm font-semibold text-amber-950">
                Aucune ligne administrative trouvée, mais des articles POS existent.
              </p>
              <p className="mt-2 text-xs text-amber-900/80">
                Excel reste une option de mise à jour. Complétez depuis le POS pour afficher
                matières, laizes et prix à modifier.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                {canEdit ? (
                  <AppButton
                    type="button"
                    variant="default"
                    disabled={backfilling || syncing}
                    onClick={() => void backfillFromPos()}
                  >
                    {backfilling ? 'Complétion…' : backfillLabel}
                  </AppButton>
                ) : null}
                <AppButton
                  type="button"
                  variant="outline"
                  onClick={() => void load()}
                  disabled={backfilling || syncing}
                >
                  Actualiser
                </AppButton>
              </div>
            </div>
          ) : (
            <SmartDataGrid
              rows={displayRows}
              columns={columns}
              canEdit={canEdit && view === 'liste'}
              searchPlaceholder="Recherche libellé, référence, ID…"
              getSearchBlob={(row) =>
                `${row[nameKey] ?? ''} ${row.name ?? ''} ${row.reference ?? ''} ${row.excelId ?? ''}`
              }
              emptyTitle={
                view === 'corbeille'
                  ? 'Corbeille vide.'
                  : enableBackfillFromPos
                    ? 'Aucune ligne — utilisez « Compléter depuis POS » ou importez un Excel.'
                    : 'Aucune ligne — importez un Excel.'
              }
              onBulkDelete={
                canEdit && view === 'liste'
                  ? (ids) => {
                      setPendingBulkIds(ids);
                      setBulkDeleteOpen(true);
                    }
                  : undefined
              }
              rowActions={(row) => {
                const label = String(row[nameKey] ?? row.name ?? '');
                return (
                  <div className="inline-flex items-center justify-center gap-1">
                    {canEdit && view === 'liste' && row.status !== 'published' ? (
                      <button
                        type="button"
                        onClick={() => void publish(row.id)}
                        className="rounded border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600 hover:bg-gray-50"
                      >
                        Publier
                      </button>
                    ) : null}
                    <AdminRowActions
                      itemLabel={label}
                      canEdit={canEdit && view === 'liste'}
                      hideEdit
                      hideDuplicate
                      onDelete={view === 'liste' ? () => setArchiveId(row.id) : undefined}
                    />
                  </div>
                );
              }}
            />
          )}
        </>
      )}

      <ConfirmDialog
        open={archiveId != null}
        onOpenChange={(open) => {
          if (!open) setArchiveId(null);
        }}
        title="Archiver cette ligne ?"
        description="La ligne sera déplacée vers la corbeille et retirée du POS."
        confirmLabel="Archiver"
        variant="destructive"
        onConfirm={() => {
          if (archiveId) void archive(archiveId);
        }}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Supprimer la sélection ?"
        description={`${pendingBulkIds.length} ligne(s) seront déplacées vers la corbeille.`}
        confirmLabel="Supprimer sélection"
        variant="destructive"
        onConfirm={() => void deleteSelected()}
      />
    </div>
  );
}
