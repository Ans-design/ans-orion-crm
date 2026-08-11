'use client';


import { AppButton } from '@/components/ui/app-ui';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Upload, RefreshCw, Archive, RotateCcw, Trash2, AlertTriangle, History } from 'lucide-react';
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
  TEXTILE_SUPPORTS_COLUMNS,
  TEXTILE_MARKING_COLUMNS,
  TEXTILE_LABOR_COLUMNS,
  TEXTILE_RULES_COLUMNS,
  TEXTILE_TIERS_COLUMNS,
} from '@/lib/backoffice/textile-excel-format';

type Row = Record<string, unknown> & { id: string };
type Kind = 'supports' | 'markings' | 'labors' | 'rules' | 'tiers';
type UiTab = Kind | 'excel' | 'anomalies' | 'history';

const DATA_TABS: {
  id: Kind;
  label: string;
  columns: readonly string[];
  sheet: string;
  priceKey: string;
  nameKey: string;
}[] = [
  { id: 'supports', label: 'Supports vierges', columns: TEXTILE_SUPPORTS_COLUMNS, sheet: '01_SUPPORTS_TEXTILES', priceKey: 'prixSupportVierge', nameKey: 'matiere' },
  { id: 'markings', label: 'Prix marquage', columns: TEXTILE_MARKING_COLUMNS, sheet: '02_MARQUAGE_TEXTILE', priceKey: 'prixMarquage', nameKey: 'technique' },
  { id: 'labors', label: 'Main d’œuvre', columns: TEXTILE_LABOR_COLUMNS, sheet: '03_MAIN_OEUVRE_TEXTILE', priceKey: 'prixLabor', nameKey: 'typeLabor' },
  { id: 'rules', label: 'Règles textile', columns: TEXTILE_RULES_COLUMNS, sheet: '04_RÈGLES_TEXTILE', priceKey: 'formula', nameKey: 'articleId' },
  { id: 'tiers', label: 'Paliers & remises', columns: TEXTILE_TIERS_COLUMNS, sheet: '05_PALIERS_REMISES_TEXTILE', priceKey: 'valeurRemise', nameKey: 'articleId' },
];

type Props = { canEdit: boolean };

export function TextileAdminWorkspace({ canEdit }: Props) {
  const [tab, setTab] = useState<UiTab>('supports');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [anomalies, setAnomalies] = useState<Array<Record<string, unknown>>>([]);
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const workbookRef = useRef<HTMLInputElement>(null);

  const dataTab = DATA_TABS.find((t) => t.id === tab);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'anomalies') {
        const r = await fetch('/api/admin-backoffice/textile?anomalies=1', { cache: 'no-store' });
        const d = await r.json();
        if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Anomalies impossibles');
        setAnomalies(d.data.anomalies ?? []);
        setRows([]);
        return;
      }
      if (tab === 'history') {
        const r = await fetch('/api/admin-backoffice/textile?history=1', { cache: 'no-store' });
        const d = await r.json();
        if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Historique impossible');
        setHistory(d.data.history ?? []);
        setRows([]);
        return;
      }
      if (tab === 'excel') {
        setRows([]);
        return;
      }
      const kind = tab as Kind;
      const q = new URLSearchParams({ kind });
      if (showTrash) q.set('trash', '1');
      const r = await fetch(`/api/admin-backoffice/textile?${q}`, { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Chargement impossible');
      setRows(d.data.rows ?? []);
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [tab, showTrash]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }, [rows, filter]);

  const syncAll = async () => {
    setSyncing(true);
    try {
      const r = await fetch('/api/admin-backoffice/textile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync-all' }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Sync impossible');
      uxToast.success(`Sync POS OK — ${d.data.modelsSynced ?? 0} article(s)`);
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur sync');
    } finally {
      setSyncing(false);
    }
  };

  const updatePrice = async (id: string, price: number) => {
    if (!dataTab) return;
    try {
      const r = await fetch(`/api/admin-backoffice/textile/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: dataTab.id, [dataTab.priceKey]: price, action: 'sync' }),
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
    if (!archiveId || !dataTab) return;
    try {
      const r = await fetch('/api/admin-backoffice/textile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive', kind: dataTab.id, id: archiveId }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Archive impossible');
      uxToast.success('Ligne archivée — POS resynchronisé');
      setArchiveId(null);
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const doRestore = async (id: string) => {
    if (!dataTab) return;
    try {
      const r = await fetch('/api/admin-backoffice/textile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', kind: dataTab.id, id }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Restauration impossible');
      uxToast.success('Ligne restaurée');
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const onExportSheet = async () => {
    if (!dataTab) return;
    try {
      const r = await fetch('/api/admin-backoffice/textile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export', kind: dataTab.id }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Export impossible');
      exportGenericRowsToXlsx(d.data.rows, d.data.columns ?? dataTab.columns, `textile-${dataTab.id}`, dataTab.sheet);
      uxToast.success('Export feuille téléchargé');
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur export');
    }
  };

  const onExportWorkbook = async () => {
    try {
      const r = await fetch('/api/admin-backoffice/textile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export-workbook' }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Export impossible');
      exportMultiSheetXlsx(d.data.sheets ?? [], 'textile-workbook');
      uxToast.success('Classeur 5 feuilles téléchargé');
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur export');
    }
  };

  const onImportSheet = async (file: File) => {
    if (!dataTab) return;
    try {
      const parsed = await parseXlsxFile(file);
      const r = await fetch('/api/admin-backoffice/textile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', kind: dataTab.id, rows: parsed }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Import impossible');
      if ((d.data.errors ?? []).length) {
        uxToast.error(`${d.data.errors.length} erreur(s) — ${d.data.errors[0]}`);
      } else {
        uxToast.success(`Import: ${d.data.created ?? 0} créés, ${d.data.updated ?? 0} maj`);
      }
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur import');
    }
  };

  const onImportWorkbook = async (file: File) => {
    try {
      const sheets = await parseMultiSheetXlsx(file);
      const r = await fetch('/api/admin-backoffice/textile', {
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
          <h1 className="text-xl font-semibold text-foreground">Textile — Catalogue, Prix & Stock</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Support vierge + marquage + main d’œuvre. Lambahoany = surface m². Une carte POS par article ;
            les variantes restent des options (matière, taille, technique…).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {dataTab && (
            <AppButton
              type="button"
              variant="outline"
              className={`inline-flex items-center gap-1.5 ${showTrash ? 'ring-1 ring-primary' : ''}`}
              onClick={() => setShowTrash((v) => !v)}
            >
              <Trash2 className="h-3.5 w-3.5" /> {showTrash ? 'Quitter corbeille' : 'Corbeille'}
            </AppButton>
          )}
          <AppButton type="button" variant="outline" className="inline-flex items-center gap-1.5" onClick={() => void onExportWorkbook()}>
            <Download className="h-3.5 w-3.5" /> Export 5 feuilles
          </AppButton>
          {canEdit && (
            <>
              <AppButton type="button" variant="outline" className="inline-flex items-center gap-1.5" onClick={() => workbookRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" /> Import classeur
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

      <div className="flex flex-wrap gap-1.5 border-b border-border pb-2">
        {[...DATA_TABS.map((t) => ({ id: t.id as UiTab, label: t.label })),
          { id: 'excel' as UiTab, label: 'Import / Export Excel' },
          { id: 'anomalies' as UiTab, label: 'Anomalies' },
          { id: 'history' as UiTab, label: 'Historique' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              tab === t.id ? 'bg-primary text-white' : 'bg-muted/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {dataTab && (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              className="ab2-input max-w-xs text-xs"
              placeholder="Rechercher article, matière, technique…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <AppButton type="button" variant="outline" className="inline-flex items-center gap-1.5 text-xs" onClick={() => void onExportSheet()}>
              <Download className="h-3.5 w-3.5" /> Export feuille
            </AppButton>
            {canEdit && (
              <>
                <AppButton type="button" variant="outline" className="inline-flex items-center gap-1.5 text-xs" onClick={() => fileRef.current?.click()}>
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
              </>
            )}
          </div>

          <div className="overflow-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 sticky top-0">
                <tr>
                  <th className="text-left p-2 font-semibold">Article</th>
                  <th className="text-left p-2 font-semibold">Libellé</th>
                  <th className="text-right p-2 font-semibold">Prix</th>
                  <th className="text-left p-2 font-semibold">Statut</th>
                  <th className="text-right p-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Chargement…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Aucune ligne</td></tr>
                ) : (
                  filtered.map((row) => {
                    const price = Number(row[dataTab.priceKey] ?? 0);
                    const label = String(row[dataTab.nameKey] ?? row.technique ?? row.typeLabor ?? '—');
                    return (
                      <tr key={row.id} className="border-t border-border/60 hover:bg-muted/20">
                        <td className="p-2 font-mono">{String(row.articleId ?? '—')}</td>
                        <td className="p-2">{label}{row.taille ? ` · ${String(row.taille)}` : ''}{row.tailleMarquage ? ` · ${String(row.tailleMarquage)}` : ''}</td>
                        <td className="p-2 text-right">
                          {canEdit && !showTrash && dataTab.priceKey !== 'formula' ? (
                            <input
                              type="number"
                              className="ab2-input w-28 text-right text-xs ml-auto"
                              defaultValue={price}
                              onBlur={(e) => {
                                const next = Number(e.target.value);
                                if (Number.isFinite(next) && next !== price) void updatePrice(row.id, next);
                              }}
                            />
                          ) : dataTab.priceKey === 'formula' ? (
                            <span className="text-muted-foreground">{String(row.formula ?? row.typeCalcul ?? '—')}</span>
                          ) : (
                            formatPrice(price)
                          )}
                        </td>
                        <td className="p-2">{String(row.status ?? (row.active ? 'published' : 'archived'))}</td>
                        <td className="p-2 text-right">
                          {showTrash ? (
                            <button type="button" className="inline-flex items-center gap-1 text-primary" onClick={() => void doRestore(row.id)}>
                              <RotateCcw className="h-3.5 w-3.5" /> Restaurer
                            </button>
                          ) : canEdit ? (
                            <button type="button" className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary" onClick={() => setArchiveId(row.id)}>
                              <Archive className="h-3.5 w-3.5" /> Archiver
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'excel' && (
        <div className="rounded-lg border border-border p-4 space-y-3 text-sm">
          <p className="font-semibold">Classeur Excel textile (5 feuilles)</p>
          <ul className="list-disc pl-5 text-muted-foreground text-xs space-y-1">
            <li>01_SUPPORTS_TEXTILES</li>
            <li>02_MARQUAGE_TEXTILE</li>
            <li>03_MAIN_OEUVRE_TEXTILE</li>
            <li>04_RÈGLES_TEXTILE</li>
            <li>05_PALIERS_REMISES_TEXTILE</li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <AppButton type="button" variant="outline" className="inline-flex items-center gap-1.5" onClick={() => void onExportWorkbook()}>
              <Download className="h-3.5 w-3.5" /> Télécharger modèle / export
            </AppButton>
            {canEdit && (
              <AppButton type="button" variant="default" className="inline-flex items-center gap-1.5" onClick={() => workbookRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" /> Importer classeur
              </AppButton>
            )}
          </div>
        </div>
      )}

      {tab === 'anomalies' && (
        <div className="rounded-lg border border-border overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left p-2">Niveau</th>
                <th className="text-left p-2">Article</th>
                <th className="text-left p-2">Message</th>
                <th className="text-left p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Scan…</td></tr>
              ) : anomalies.length === 0 ? (
                <tr><td colSpan={4} className="p-6 text-center text-emerald-600">Aucune anomalie textile</td></tr>
              ) : (
                anomalies.map((a) => (
                  <tr key={String(a.id)} className="border-t border-border/60">
                    <td className="p-2">
                      <span className={`inline-flex items-center gap-1 ${a.level === 'error' ? 'text-primary' : 'text-amber-600'}`}>
                        <AlertTriangle className="h-3.5 w-3.5" /> {String(a.level)}
                      </span>
                    </td>
                    <td className="p-2 font-mono">{String(a.articleId)}</td>
                    <td className="p-2">{String(a.message)}</td>
                    <td className="p-2 text-muted-foreground">{String(a.action)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'history' && (
        <div className="rounded-lg border border-border overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Action</th>
                <th className="text-left p-2">Entité</th>
                <th className="text-left p-2">Utilisateur</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Chargement…</td></tr>
              ) : history.length === 0 ? (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Aucun événement</td></tr>
              ) : (
                history.map((h) => (
                  <tr key={String(h.id)} className="border-t border-border/60">
                    <td className="p-2 whitespace-nowrap">
                      <History className="inline h-3 w-3 mr-1 opacity-50" />
                      {h.createdAt ? new Date(String(h.createdAt)).toLocaleString('fr-FR') : '—'}
                    </td>
                    <td className="p-2">{String(h.action)}</td>
                    <td className="p-2">{String(h.entity)}{h.entityId ? ` · ${String(h.entityId)}` : ''}</td>
                    <td className="p-2">{String(h.userName ?? '—')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!archiveId}
        onOpenChange={(o) => !o && setArchiveId(null)}
        title="Archiver cette ligne ?"
        description="La ligne ira en corbeille (restorable). Le POS sera resynchronisé."
        confirmLabel="Archiver"
        onConfirm={() => void doArchive()}
      />
    </div>
  );
}
