'use client';


import { AppButton } from '@/components/ui/app-ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Upload, RefreshCw, Archive, RotateCcw, Trash2 } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import {
  exportGenericRowsToXlsx,
  exportMultiSheetXlsx,
  parseXlsxFile,
  parseMultiSheetXlsx,
} from '@/lib/admin/excel-table';
import { formatPrice } from '@/lib/data/catalogue';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  GOODIES_MODELS_COLUMNS,
  GOODIES_TECHNIQUES_COLUMNS,
  GOODIES_ADDONS_COLUMNS,
  GOODIES_DEPS_COLUMNS,
} from '@/lib/backoffice/goodies-excel-format';

type Row = Record<string, unknown> & { id: string };
type Kind = 'models' | 'techniques' | 'addons' | 'deps';

const TABS: { id: Kind; label: string; columns: readonly string[]; sheet: string; priceKey: string; nameKey: string }[] = [
  { id: 'models', label: 'Modèles', columns: GOODIES_MODELS_COLUMNS, sheet: '01_Goodies_Modeles', priceKey: 'prixVierge', nameKey: 'typeModele' },
  { id: 'techniques', label: 'Techniques', columns: GOODIES_TECHNIQUES_COLUMNS, sheet: '02_Goodies_Techniques', priceKey: 'prixTechnique', nameKey: 'technique' },
  { id: 'addons', label: 'Suppléments', columns: GOODIES_ADDONS_COLUMNS, sheet: '03_Goodies_Supplements', priceKey: 'price', nameKey: 'name' },
  { id: 'deps', label: 'Dépendances', columns: GOODIES_DEPS_COLUMNS, sheet: '04_Dependances_Options', priceKey: 'allowedValues', nameKey: 'sourceValue' },
];

type Props = { canEdit: boolean };

export function GoodiesAdminWorkspace({ canEdit }: Props) {
  const [kind, setKind] = useState<Kind>('models');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const workbookRef = useRef<HTMLInputElement>(null);
  const tab = TABS.find((t) => t.id === kind)!;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ kind });
      if (showTrash) q.set('trash', '1');
      const r = await fetch(`/api/admin-backoffice/goodies?${q}`, { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Chargement impossible');
      setRows(d.data.rows ?? []);
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [kind, showTrash]);

  useEffect(() => {
    void load();
  }, [load]);

  const syncAll = async () => {
    setSyncing(true);
    try {
      const r = await fetch('/api/admin-backoffice/goodies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync-all', kind }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Sync impossible');
      uxToast.success(`Sync POS OK — modèles ${d.data.modelsSynced ?? 0}, techniques ${d.data.techniquesSynced ?? 0}`);
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur sync');
    } finally {
      setSyncing(false);
    }
  };

  const updatePrice = async (id: string, price: number) => {
    try {
      const r = await fetch(`/api/admin-backoffice/goodies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, [tab.priceKey]: price, action: 'sync' }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'MAJ impossible');
      uxToast.success('Prix mis à jour et synchronisé POS');
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const doArchive = async () => {
    if (!archiveId) return;
    try {
      const r = await fetch('/api/admin-backoffice/goodies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive', kind, id: archiveId }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Archive impossible');
      uxToast.success('Ligne archivée (corbeille) — POS resynchronisé');
      setArchiveId(null);
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const doRestore = async (id: string) => {
    try {
      const r = await fetch('/api/admin-backoffice/goodies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', kind, id }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Restauration impossible');
      uxToast.success('Ligne restaurée — POS resynchronisé');
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const onExportSheet = async () => {
    try {
      const r = await fetch('/api/admin-backoffice/goodies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export', kind }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Export impossible');
      exportGenericRowsToXlsx(d.data.rows, d.data.columns ?? tab.columns, `goodies-${kind}`, tab.sheet);
      uxToast.success('Export feuille téléchargé');
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur export');
    }
  };

  const onExportWorkbook = async () => {
    try {
      const r = await fetch('/api/admin-backoffice/goodies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export-workbook' }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Export impossible');
      exportMultiSheetXlsx(d.data.sheets ?? [], 'goodies-workbook');
      uxToast.success('Classeur 4 feuilles téléchargé');
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur export');
    }
  };

  const onImportSheet = async (file: File) => {
    try {
      const parsed = await parseXlsxFile(file);
      const r = await fetch('/api/admin-backoffice/goodies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', kind, rows: parsed }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Import impossible');
      uxToast.success(
        `Import: ${d.data.created ?? 0} créés, ${d.data.updated ?? 0} maj, sync ${d.data.synced ?? 0}`,
      );
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur import');
    }
  };

  const onImportWorkbook = async (file: File) => {
    try {
      const sheets = await parseMultiSheetXlsx(file);
      const r = await fetch('/api/admin-backoffice/goodies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import-workbook', sheets }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Import impossible');
      uxToast.success(
        `Workbook: ${d.data.sheets ?? 0} feuille(s), ${d.data.created ?? 0} créés, ${d.data.updated ?? 0} maj`,
      );
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur import workbook');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Goodies — Admin → POS</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Modèles, techniques, suppléments et dépendances. Les chips et prix synchronisent automatiquement le POS Commercial.
            Une carte POS par article métier — les variantes restent des options.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AppButton
            type="button"
            variant="outline"
            className={`inline-flex items-center gap-1.5 ${showTrash ? 'ring-1 ring-primary' : ''}`}
            onClick={() => setShowTrash((v) => !v)}
          >
            <Trash2 className="h-3.5 w-3.5" /> {showTrash ? 'Quitter corbeille' : 'Corbeille'}
          </AppButton>
          <AppButton type="button" variant="outline" className="inline-flex items-center gap-1.5" onClick={() => void onExportSheet()}>
            <Download className="h-3.5 w-3.5" /> Export feuille
          </AppButton>
          <AppButton type="button" variant="outline" className="inline-flex items-center gap-1.5" onClick={() => void onExportWorkbook()}>
            <Download className="h-3.5 w-3.5" /> Export 4 feuilles
          </AppButton>
          {canEdit && (
            <>
              <AppButton type="button" variant="outline" className="inline-flex items-center gap-1.5" onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" /> Import feuille
              </AppButton>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onImportSheet(f);
                  e.target.value = '';
                }}
              />
              <AppButton type="button" variant="outline" className="inline-flex items-center gap-1.5" onClick={() => workbookRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" /> Import workbook
              </AppButton>
              <input
                ref={workbookRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onImportWorkbook(f);
                  e.target.value = '';
                }}
              />
              <AppButton type="button" variant="default" className="inline-flex items-center gap-1.5" disabled={syncing}
                onClick={() => void syncAll()}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} /> Sync POS
              </AppButton>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border pb-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`px-3 py-2 text-sm rounded-t-lg ${
              kind === t.id
                ? 'bg-background border border-b-transparent border-border font-medium text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setKind(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Chargement…</p>
      ) : (
        <div className="overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 sticky top-0">
              <tr>
                <th className="text-left p-2">Article</th>
                <th className="text-left p-2">{tab.nameKey === 'typeModele' ? 'Modèle' : tab.nameKey === 'technique' ? 'Technique' : tab.nameKey === 'name' ? 'Supplément' : 'Valeur source'}</th>
                <th className="text-right p-2">{kind === 'deps' ? 'Valeurs autorisées' : 'Prix'}</th>
                <th className="text-left p-2">POS</th>
                {canEdit && <th className="text-right p-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="p-2 font-mono text-xs">{String(row.articleId ?? '')}</td>
                  <td className="p-2">{String(row[tab.nameKey] ?? '')}</td>
                  <td className="p-2 text-right">
                    {kind === 'deps' ? (
                      <span className="text-xs">{String(row.allowedValues ?? '').slice(0, 60)}</span>
                    ) : canEdit && !showTrash ? (
                      <input
                        type="number"
                        className="w-28 rounded-lg border border-border bg-background px-2 py-1 text-right"
                        defaultValue={Number(row[tab.priceKey] ?? 0)}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (Number.isFinite(v) && v !== Number(row[tab.priceKey])) {
                            void updatePrice(row.id, v);
                          }
                        }}
                      />
                    ) : (
                      formatPrice(Number(row[tab.priceKey] ?? 0))
                    )}
                  </td>
                  <td className="p-2">
                    <span className={`text-xs ${row.visiblePOS === false || row.active === false ? 'text-muted-foreground' : 'text-emerald-600'}`}>
                      {showTrash ? 'archivé' : row.visiblePOS === false ? 'masqué' : row.active === false ? 'inactif' : 'visible'}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="p-2 text-right">
                      {showTrash ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline"
                          onClick={() => void doRestore(row.id)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Restaurer
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                          onClick={() => setArchiveId(row.id)}
                        >
                          <Archive className="h-3.5 w-3.5" /> Archiver
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    {showTrash ? 'Corbeille vide.' : 'Aucune ligne — importez un Excel ou lancez le seed.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!archiveId}
        onOpenChange={(o) => !o && setArchiveId(null)}
        title="Archiver cette ligne ?"
        description="Soft-delete (corbeille). La chip disparaît du POS après sync. Aucune suppression définitive."
        confirmLabel="Archiver"
        onConfirm={() => void doArchive()}
      />
    </div>
  );
}
