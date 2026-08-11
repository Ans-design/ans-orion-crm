'use client';

import { useCallback, useEffect, useState } from 'react';
import { uxToast } from '@/lib/ux/feedback';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ChevronLeft, ChevronRight, Download, GitCompare, RotateCcw, Save, Search } from 'lucide-react';
import { formatPriceAr } from '@/lib/data/catalogue';

type MaterialRow = {
  id: string;
  key: string;
  label: string;
  family: string;
  actif: boolean;
  source: string | null;
  grammages: { id: string; value: string; actif: boolean }[];
};

type SalePriceRow = {
  id: string;
  productNormalized: string;
  format: string | null;
  material: string | null;
  grammage: string | null;
  face: string | null;
  qtyTier: string | null;
  sourcePriceAr: number | null;
  salePriceAr: number | null;
  adminModified: boolean;
  priceType: string;
  actif: boolean;
};

type CompareStats = {
  total: number;
  modified: number;
  unchanged: number;
  missingSource: number;
  totalDeltaAr: number;
};

type AnomalyRow = {
  id: string;
  sheet: string;
  ref: string | null;
  severity: string;
  message: string;
  decision: string | null;
  resolved: boolean;
  createdAt: string;
};

function ToggleBtn({ on, disabled, onClick, label }: {
  on: boolean;
  disabled?: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={label}
      className={`text-xs font-medium px-2 py-0.5 rounded-full transition-colors disabled:opacity-100 disabled:bg-[var(--app-disabled-bg)] disabled:text-[var(--app-disabled-text)] ${
        on ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-400'
      }`}
    >
      {on ? 'ON' : 'OFF'}
    </button>
  );
}

export function FusionMaterialsPanel({ canEdit }: { canEdit: boolean }) {
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/fusion/materials');
      if (r.ok) {
        const d = await r.json();
        setMaterials(d.materials ?? []);
      } else uxToast.error('Impossible de charger les matières DB');
    } catch {
      uxToast.error('Erreur réseau matières');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (type: 'material' | 'grammage', id: string, actif: boolean) => {
    const r = await fetch('/api/fusion/materials', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id, actif }),
    });
    if (r.ok) {
      uxToast.success(actif ? 'Activé' : 'Désactivé');
      load();
    } else {
      const err = await r.json().catch(() => ({}));
      uxToast.error(err.error, 'Erreur');
    }
  };

  const filtered = materials.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.label.toLowerCase().includes(q)
      || m.key.toLowerCase().includes(q)
      || m.family.toLowerCase().includes(q)
      || m.grammages.some((g) => g.value.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Chargement catalogue matières…</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Catalogue fusion DB — matière et grammage séparés. Les entrées inactives sont exclues du POS (`/api/materials-catalog`).
      </p>
      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filtrer matière, famille, grammage…"
          className="w-full pl-9 pr-3 py-2 rounded-[7px] border border-border bg-card text-sm outline-none"
        />
      </div>
      <div className="space-y-3">
        {filtered.map((m) => (
          <div key={m.id} className={`bg-card border border-border rounded-[7px] p-4 ${!m.actif ? 'opacity-70' : ''}`}>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <span className="font-semibold text-sm">{m.label}</span>
              <span className="orion-text-code text-muted-foreground">{m.key}</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent">{m.family}</span>
              {m.source && <span className="orion-text-meta">{m.source}</span>}
              <span className="ml-auto flex items-center gap-2">
                <span className="orion-text-meta">Matière</span>
                {canEdit ? (
                  <ToggleBtn on={m.actif} onClick={() => toggle('material', m.id, !m.actif)} label={m.label} />
                ) : (
                  <span className={`text-xs font-medium ${m.actif ? 'text-green-500' : 'text-gray-400'}`}>
                    {m.actif ? 'Actif' : 'Inactif'}
                  </span>
                )}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {m.grammages.map((g) => (
                <span
                  key={g.id}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg orion-text-code border ${
                    g.actif ? 'border-border bg-accent/50' : 'border-dashed opacity-50'
                  }`}
                >
                  {g.value}
                  {canEdit && (
                    <ToggleBtn on={g.actif} onClick={() => toggle('grammage', g.id, !g.actif)} label={g.value} />
                  )}
                </span>
              ))}
              {m.grammages.length === 0 && (
                <span className="orion-text-meta italic">Aucun grammage</span>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Aucune matière — lancez import:fusion</p>
        )}
      </div>
    </div>
  );
}

export function FusionSalePricesPanel({ canEdit }: { canEdit: boolean }) {
  const [items, setItems] = useState<SalePriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'manual' | 'modified'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [compare, setCompare] = useState<CompareStats | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    variant?: 'default' | 'destructive';
    run: () => void | Promise<void>;
  } | null>(null);

  const loadCompare = useCallback(async () => {
    try {
      const r = await fetch('/api/fusion/sale-prices?action=compare');
      if (r.ok) setCompare(await r.json());
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '50',
        filter,
        ...(search ? { q: search } : {}),
      });
      const r = await fetch(`/api/fusion/sale-prices?${params}`);
      if (r.ok) {
        const d = await r.json();
        setItems(d.items ?? []);
        setTotalPages(d.totalPages ?? 1);
        setTotal(d.total ?? 0);
      } else uxToast.error('Impossible de charger PRIX 2026');
    } catch {
      uxToast.error('Erreur réseau prix');
    }
    setLoading(false);
  }, [page, filter, search]);

  useEffect(() => {
    const t = setTimeout(() => {
      load();
      loadCompare();
    }, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, loadCompare, search]);

  const toggle = async (id: string, actif: boolean) => {
    const r = await fetch('/api/fusion/sale-prices', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, actif }),
    });
    if (r.ok) {
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, actif } : x)));
    } else {
      const err = await r.json().catch(() => ({}));
      uxToast.error(err.error, 'Erreur');
    }
  };

  const startEdit = (row: SalePriceRow) => {
    setEditingId(row.id);
    setEditValue(String(row.salePriceAr ?? ''));
  };

  const saveEdit = async (id: string) => {
    const val = parseFloat(editValue);
    if (!Number.isFinite(val) || val < 0) {
      uxToast.error('Prix invalide');
      return;
    }
    setSaving(true);
    const r = await fetch('/api/fusion/sale-prices', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, salePriceAr: val }),
    });
    setSaving(false);
    if (r.ok) {
      uxToast.success('Prix enregistré — POS mis à jour');
      setEditingId(null);
      load();
      loadCompare();
    } else {
      const err = await r.json().catch(() => ({}));
      uxToast.error(err.error, 'Erreur sauvegarde');
    }
  };

  const resetRow = (id: string) => {
    setPendingConfirm({
      title: 'Réinitialiser cette ligne ?',
      description: 'Remettre cette ligne à la valeur PRIX 2026 d\'origine.',
      confirmLabel: 'Réinitialiser',
      variant: 'destructive',
      run: async () => {
        const r = await fetch('/api/fusion/sale-prices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reset_row', id }),
        });
        if (r.ok) {
          uxToast.success('Ligne réinitialisée');
          load();
          loadCompare();
        } else {
          const err = await r.json().catch(() => ({}));
          uxToast.error(err.error, 'Erreur reset');
        }
      },
    });
  };

  const resetAllModified = () => {
    setPendingConfirm({
      title: 'Réinitialiser la grille modifiée ?',
      description: `Réinitialiser ${compare?.modified ?? 'toutes les'} lignes modifiées vers PRIX 2026.`,
      confirmLabel: 'Réinitialiser tout',
      variant: 'destructive',
      run: async () => {
        const r = await fetch('/api/fusion/sale-prices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reset_modified' }),
        });
        if (r.ok) {
          const d = await r.json();
          uxToast.success(`${d.resetCount ?? 0} ligne(s) réinitialisée(s)`);
          load();
          loadCompare();
        } else {
          const err = await r.json().catch(() => ({}));
          uxToast.error(err.error, 'Erreur reset grille');
        }
      },
    });
  };

  const exportJson = async () => {
    const r = await fetch('/api/fusion/sale-prices?action=export');
    if (!r.ok) {
      uxToast.error('Export impossible');
      return;
    }
    const data = await r.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ans-price-store-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    uxToast.success('Export JSON téléchargé');
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        ANS_PRICE_STORE — grille PRIX 2026 rééditable. Le POS lit <code className="orion-text-code">salePriceAr</code> (valeur courante), jamais le fichier Excel directement.
      </p>

      {compare && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-1 rounded-lg bg-accent">{compare.total} lignes actives</span>
          <span className="px-2 py-1 rounded-lg bg-[rgba(255,23,77,0.1)] text-[var(--accent-primary,#FF174D)] font-semibold">{compare.modified} modifiée(s)</span>
          <span className="px-2 py-1 rounded-lg bg-green-500/10 text-green-600">{compare.unchanged} identique(s) PRIX 2026</span>
          {compare.totalDeltaAr !== 0 && (
            <span className="px-2 py-1 rounded-lg bg-orange-500/10 text-orange-600">
              Écart cumulé : {formatPriceAr(compare.totalDeltaAr)} Ar
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canEdit && (
          <>
            <button type="button" onClick={loadCompare} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-accent">
              <GitCompare size={12} /> Comparer PRIX 2026
            </button>
            <button type="button" onClick={resetAllModified} disabled={!compare?.modified} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-500/30 text-orange-600 text-xs hover:bg-orange-500/10 disabled:opacity-100 disabled:bg-[var(--app-disabled-bg)] disabled:text-[var(--app-disabled-text)] disabled:border-[var(--app-border)]">
              <RotateCcw size={12} /> Reset grille modifiée
            </button>
          </>
        )}
        <button type="button" onClick={exportJson} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-accent">
          <Download size={12} /> Export JSON
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Produit, format, matière, palier…"
            className="w-full pl-9 pr-3 py-2 rounded-[7px] border border-border bg-card text-sm outline-none"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => { setFilter(e.target.value as typeof filter); setPage(1); }}
          className="px-3 py-2 rounded-[7px] border border-border bg-card text-sm"
        >
          <option value="all">Tous ({total > 0 && !search ? total : '…'})</option>
          <option value="active">Actifs auto</option>
          <option value="inactive">Inactifs</option>
          <option value="manual">Sur devis / manual</option>
          <option value="modified">Modifiés admin</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Chargement…</p>
      ) : (
        <div className="bg-card border border-border rounded-[7px] overflow-x-auto">
          <table className="w-full text-xs min-w-[1000px]">
            <thead className="bg-accent/50 text-muted-foreground uppercase">
              <tr>
                <th className="text-left p-2">Actif</th>
                <th className="text-left p-2">Produit</th>
                <th className="text-left p-2">Format</th>
                <th className="text-left p-2">Matière</th>
                <th className="text-left p-2">Grammage</th>
                <th className="text-left p-2">Face</th>
                <th className="text-left p-2">Palier qty</th>
                <th className="text-right p-2">PRIX 2026</th>
                <th className="text-right p-2">Prix actuel</th>
                <th className="text-left p-2">Type</th>
                {canEdit && <th className="text-right p-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const src = row.sourcePriceAr ?? row.salePriceAr;
                const delta = src != null && row.salePriceAr != null ? row.salePriceAr - src : 0;
                return (
                  <tr key={row.id} className={`border-t border-border hover:bg-accent/20 ${!row.actif ? 'opacity-60' : ''}`}>
                    <td className="p-2">
                      {canEdit && row.priceType !== 'manual' ? (
                        <ToggleBtn on={row.actif} onClick={() => toggle(row.id, !row.actif)} />
                      ) : (
                        <span className={`text-xs font-medium ${row.actif ? 'text-green-500' : 'text-gray-400'}`}>
                          {row.actif ? 'ON' : 'OFF'}
                        </span>
                      )}
                    </td>
                    <td className="p-2 font-medium max-w-[180px] truncate" title={row.productNormalized}>
                      {row.productNormalized}
                      {row.adminModified && (
                        <span className="ml-1 px-1 py-0.5 rounded bg-[rgba(255,23,77,0.1)] text-[var(--accent-primary,#FF174D)] text-[9px] font-bold">MOD</span>
                      )}
                    </td>
                    <td className="p-2">{row.format ?? '—'}</td>
                    <td className="p-2">{row.material ?? '—'}</td>
                    <td className="p-2">{row.grammage ?? '—'}</td>
                    <td className="p-2">{row.face ?? '—'}</td>
                    <td className="p-2 orion-text-code">{row.qtyTier ?? '—'}</td>
                    <td className="p-2 text-right font-mono text-muted-foreground">{formatPriceAr(src && src > 0 ? src : null)}</td>
                    <td className="p-2 text-right font-mono">
                      {editingId === row.id ? (
                        <input
                          type="number"
                          min={0}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-24 text-right px-1 py-0.5 rounded border border-[#FFD60A] bg-background font-mono"
                          autoFocus
                        />
                      ) : (
                        <span className={row.adminModified ? 'text-[var(--accent-primary,#FF174D)] font-bold' : ''}>
                          {formatPriceAr(row.salePriceAr && row.salePriceAr > 0 ? row.salePriceAr : null)}
                          {delta !== 0 && row.adminModified && (
                            <span className="block text-[9px] text-orange-500">{delta > 0 ? '+' : ''}{formatPriceAr(delta)}</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="p-2">
                      <span className={`px-1.5 py-0.5 rounded orion-text-code ${row.priceType === 'manual' ? 'bg-orange-500/10 text-orange-500' : 'bg-green-500/10 text-green-500'}`}>
                        {row.priceType}
                      </span>
                    </td>
                    {canEdit && row.priceType !== 'manual' && (
                      <td className="p-2 text-right">
                        <div className="flex justify-end gap-1">
                          {editingId === row.id ? (
                            <>
                              <button type="button" disabled={saving} onClick={() => saveEdit(row.id)} className="p-1 rounded hover:bg-green-500/10 text-green-600" title="Sauvegarder">
                                <Save size={13} />
                              </button>
                              <button type="button" onClick={() => setEditingId(null)} className="p-1 rounded hover:bg-accent text-muted-foreground orion-text-code">✕</button>
                            </>
                          ) : (
                            <>
                              <button type="button" onClick={() => startEdit(row)} className="p-1 rounded hover:bg-accent text-xs font-semibold">Éditer</button>
                              {row.adminModified && (
                                <button type="button" onClick={() => resetRow(row.id)} className="p-1 rounded hover:bg-orange-500/10 text-orange-600" title="Reset PRIX 2026">
                                  <RotateCcw size={13} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    )}
                    {canEdit && row.priceType === 'manual' && <td className="p-2" />}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {items.length === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm">Aucun prix trouvé</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{total} ligne(s) · page {page}/{totalPages}</span>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="p-1.5 rounded-lg border border-border disabled:opacity-100 disabled:bg-[var(--app-disabled-bg)] disabled:text-[var(--app-disabled-text)] hover:bg-accent"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="p-1.5 rounded-lg border border-border disabled:opacity-100 disabled:bg-[var(--app-disabled-bg)] disabled:text-[var(--app-disabled-text)] hover:bg-accent"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <ConfirmDialog
        open={Boolean(pendingConfirm)}
        onOpenChange={(next) => {
          if (!next) setPendingConfirm(null);
        }}
        title={pendingConfirm?.title ?? ''}
        description={pendingConfirm?.description}
        confirmLabel={pendingConfirm?.confirmLabel}
        variant={pendingConfirm?.variant}
        onConfirm={() => {
          const run = pendingConfirm?.run;
          setPendingConfirm(null);
          void run?.();
        }}
      />
    </div>
  );
}

export function FusionAnomaliesPanel({ canEdit }: { canEdit: boolean }) {
  const [anomalies, setAnomalies] = useState<AnomalyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/fusion/anomalies?resolved=${showResolved ? 'all' : 'open'}`);
      if (r.ok) {
        const d = await r.json();
        setAnomalies(d.anomalies ?? []);
      } else uxToast.error('Impossible de charger les anomalies');
    } catch {
      uxToast.error('Erreur réseau anomalies');
    }
    setLoading(false);
  }, [showResolved]);

  useEffect(() => { load(); }, [load]);

  const resolve = async (id: string, resolved: boolean) => {
    const r = await fetch('/api/fusion/anomalies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, resolved }),
    });
    if (r.ok) {
      uxToast.success(resolved ? 'Anomalie résolue' : 'Anomalie réouverte');
      load();
    } else {
      const err = await r.json().catch(() => ({}));
      uxToast.error(err.error, 'Erreur');
    }
  };

  const severityColor = (s: string) => {
    if (/crit|error|urgent/i.test(s)) return 'text-red-500 bg-red-500/10';
    if (/warn/i.test(s)) return 'text-orange-500 bg-orange-500/10';
    return 'text-[var(--orion-red-vivid)] bg-[var(--orion-red-vivid)]/10';
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Anomalies import Excel (onglet 09) — traçabilité décisions métier.
      </p>
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} className="rounded" />
        Afficher aussi les anomalies résolues
      </label>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Chargement…</p>
      ) : (
        <div className="space-y-2">
          {anomalies.map((a) => (
            <div
              key={a.id}
              className={`bg-card border border-border rounded-[7px] p-4 flex flex-col sm:flex-row gap-3 ${a.resolved ? 'opacity-60' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${severityColor(a.severity)}`}>
                    {a.severity}
                  </span>
                  <span className="orion-text-code text-muted-foreground">{a.sheet}</span>
                  {a.ref && <span className="orion-text-code text-[var(--accent-primary,#FF174D)]">{a.ref}</span>}
                  {a.resolved && <span className="orion-text-code text-green-500 font-bold">Résolu</span>}
                </div>
                <p className="text-sm">{a.message}</p>
                {a.decision && (
                  <p className="text-xs text-muted-foreground mt-1">Décision : {a.decision}</p>
                )}
                <p className="orion-text-meta mt-1">
                  {new Date(a.createdAt).toLocaleString('fr-FR')}
                </p>
              </div>
              {canEdit && (
                <div className="flex sm:flex-col gap-2 shrink-0">
                  {!a.resolved ? (
                    <button
                      type="button"
                      onClick={() => resolve(a.id, true)}
                      className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-500 text-xs font-semibold hover:bg-green-500/20"
                    >
                      Marquer résolu
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => resolve(a.id, false)}
                      className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-accent"
                    >
                      Réouvrir
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
          {anomalies.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              {showResolved ? 'Aucune anomalie en base' : 'Aucune anomalie ouverte 🎉'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
