'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ShoppingBag, Plus, PackageCheck, RefreshCw } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { useDebounce } from '@/lib/hooks/use-debounce';
import {
  AppEmptyState, AppListSkeleton, AppButton,
  AppFormModal,
  EntityModuleDataBar, EntityListPageShell,
} from '@/components/ui/app-ui';
import { useOrionLiveRevision } from '@/lib/hooks/use-orion-live-revision';
import { SearchInput } from '@/components/ui/search-input';
import { FilterSelect } from '@/components/ui/filter-select';
import { formatPriceAr } from '@/lib/data/catalogue';
import { getApiErrorMessage, unwrapListItems } from '@/lib/api-client';
import { statusBadgeClass } from '@/lib/ui/status-styles';
import { STOCK_UNIT_DISPLAY_OPTIONS } from '@/lib/data/stock-unit-presets';
import {
  PurchaseTableToolbar,
  type PurchaseFilterChip,
  type PurchaseSortId,
} from '@/components/achats/PurchaseTableToolbar';
import '@/components/backoffice-v2/ui/admin-table.css';

type PurchaseOrderLine = {
  id?: string;
  stockItemId?: string | null;
  label: string;
  qty: number;
  purchaseUnit?: string | null;
  conversionFactor?: number | null;
  unitCost: number;
  total: number;
  receivedQty?: number;
};

type PurchaseOrder = {
  id: string;
  numero: string;
  statut: string;
  totalHT: number;
  expectedAt: string | null;
  supplier: { name: string; code: string };
  lignes: PurchaseOrderLine[];
};

type Supplier = { id: string; name: string };
type StockOption = { id: string; sku: string; label: string; unitDisplay?: string | null; unit?: string; conversionFactor?: number | null };

const STATUT_CLS: Record<string, string> = {
  Brouillon: 'bg-gray-500/10 text-gray-400',
  Commandé: statusBadgeClass('Commandé'),
  'Reçu partiel': 'bg-orange-500/10 text-orange-500',
  Reçu: 'bg-green-500/10 text-green-500',
  Annulé: 'bg-red-500/10 text-red-500',
};

const EMPTY_FORM = {
  supplierId: '',
  stockItemId: '',
  label: '',
  qty: 100,
  purchaseUnit: 'rame',
  conversionFactor: '',
  unitCost: 100,
};

export default function AchatsPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stockItems, setStockItems] = useState<StockOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [stockQuery, setStockQuery] = useState('');
  const [activeChip, setActiveChip] = useState<PurchaseFilterChip>('all');
  const [sort, setSort] = useState<PurchaseSortId>('date-desc');
  const [showTrash, setShowTrash] = useState(false);
  const debouncedSearch = useDebounce(search, 300);
  const debouncedStockQ = useDebounce(stockQuery, 300);
  const liveTick = useOrionLiveRevision(['achats', 'stock'], { debounceMs: 400 });

  useEffect(() => {
    if (debouncedStockQ.trim().length < 2) {
      setStockItems([]);
      return;
    }
    const ac = new AbortController();
    fetch(`/api/stock?suggest=1&q=${encodeURIComponent(debouncedStockQ.trim())}`, { signal: ac.signal })
      .then(async (r) => {
        if (!r.ok) return;
        const body = await r.json();
        const items = unwrapListItems<StockOption>(body);
        setStockItems(items);
      })
      .catch(() => {
        if (!ac.signal.aborted) setStockItems([]);
      });
    return () => ac.abort();
  }, [debouncedStockQ]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (activeChip !== 'all') p.set('statut', activeChip);
      if (showTrash) p.set('archived', '1');
      const [oR, sR] = await Promise.all([
        fetch(`/api/purchase-orders?${p}`),
        fetch('/api/suppliers'),
      ]);
      if (oR.ok) setOrders(unwrapListItems<PurchaseOrder>(await oR.json()));
      if (sR.ok) setSuppliers(unwrapListItems<Supplier>(await sR.json()));
      setStockItems([]);
    } catch { uxToast.error('Erreur chargement'); }
    finally { setLoading(false); }
  }, [activeChip, showTrash, liveTick]);

  useEffect(() => { void load(); }, [load]);

  const filteredOrders = useMemo(() => {
    let items = [...orders];
    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      items = items.filter((o) =>
        o.numero.toLowerCase().includes(q) ||
        o.supplier.name.toLowerCase().includes(q) ||
        o.supplier.code.toLowerCase().includes(q),
      );
    }
    switch (sort) {
      case 'date-asc':
        items.reverse();
        break;
      case 'amount-desc':
        items.sort((a, b) => b.totalHT - a.totalHT);
        break;
      case 'supplier-asc':
        items.sort((a, b) => a.supplier.name.localeCompare(b.supplier.name, 'fr'));
        break;
      default:
        break;
    }
    return items;
  }, [orders, debouncedSearch, sort]);

  const onStockSelect = (stockItemId: string) => {
    const item = stockItems.find((s) => s.id === stockItemId);
    if (!item) {
      setForm((f) => ({ ...f, stockItemId, label: '' }));
      return;
    }
    setForm((f) => ({
      ...f,
      stockItemId,
      label: item.label,
      purchaseUnit: item.unitDisplay ?? item.unit ?? 'pcs',
      conversionFactor: item.conversionFactor != null ? String(item.conversionFactor) : f.conversionFactor,
    }));
  };

  const create = async () => {
    if (saving) return;
    if (!form.supplierId) return uxToast.error('Fournisseur requis');
    if (!form.stockItemId && !form.label.trim()) return uxToast.error('SKU stock ou libellé requis');

    setSaving(true);
    try {
    const r = await fetch('/api/purchase-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId: form.supplierId,
        lignes: [{
          stockItemId: form.stockItemId || null,
          label: form.label,
          qty: form.qty,
          purchaseUnit: form.purchaseUnit || null,
          conversionFactor: form.conversionFactor ? Number(form.conversionFactor) : null,
          unitCost: form.unitCost,
        }],
      }),
    });
    if (r.ok) {
      uxToast.success('Bon d\'achat créé — réception mettra à jour le stock et Matières DB');
      setShowForm(false);
      setForm(EMPTY_FORM);
      load();
    } else {
      const err = await r.json().catch(() => ({}));
      uxToast.error(getApiErrorMessage(err, 'Erreur création'));
    }
    } finally {
      setSaving(false);
    }
  };

  const updateStatut = async (id: string, statut: string) => {
    const r = await fetch(`/api/purchase-orders/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ statut }),
    });
    if (r.ok) { uxToast.success(`Statut → ${statut}`); load(); }
  };

  const receive = async (id: string) => {
    if (receivingId) return;
    setReceivingId(id);
    try {
      const r = await fetch(`/api/purchase-orders/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'receive' }),
      });
      if (r.ok) { uxToast.success('Réception — stock + mouvement + sync Matières DB'); load(); }
      else {
        const err = await r.json().catch(() => ({}));
        uxToast.error(getApiErrorMessage(err, 'Erreur réception'));
      }
    } finally {
      setReceivingId(null);
    }
  };

  return (
    <EntityListPageShell
      title="Achats"
      description="Commandes fournisseurs — réception, entrée stock, mouvements et sync Matières DB"
      icon={ShoppingBag}
      actions={
          <div className="flex gap-2 flex-wrap items-center">
            <EntityModuleDataBar entity="purchase-orders" trash={showTrash} onTrashChange={setShowTrash} onAfterImport={load} />
            <AppButton variant="outline" size="sm" onClick={load} className="gap-2"><RefreshCw size={14} /> Actualiser</AppButton>
            <AppButton size="sm" onClick={() => setShowForm(true)} className="gap-2"><Plus size={14} /> Nouvel achat</AppButton>
          </div>
      }
    >
      <PurchaseTableToolbar
        count={filteredOrders.length}
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSortChange={setSort}
        activeChip={activeChip}
        onChipChange={setActiveChip}
      />

      {loading ? <AppListSkeleton rows={4} /> : filteredOrders.length === 0 ? (
        <AppEmptyState icon={ShoppingBag} title="Aucun achat" description="Créez un bon de commande fournisseur lié à un SKU stock." />
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((o) => (
            <div key={o.id} className="bg-card border border-border rounded-[7px] p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div>
                  <span className="font-mono font-semibold">{o.numero}</span>
                  <span className="mx-2 text-muted-foreground">·</span>
                  <span>{o.supplier.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUT_CLS[o.statut] ?? ''}`}>{o.statut}</span>
                  <span className="font-semibold">{formatPriceAr(o.totalHT)}</span>
                </div>
              </div>
              <ul className="text-sm text-muted-foreground mb-3 space-y-0.5">
                {o.lignes.map((l, i) => (
                  <li key={i}>
                    {l.label}
                    {l.stockItemId ? ' [SKU lié]' : ' [sans SKU]'}
                    {' — '}{l.qty} {l.purchaseUnit ?? 'u'} × {formatPriceAr(l.unitCost)}
                    {l.receivedQty != null && l.receivedQty > 0 ? ` (reçu: ${l.receivedQty})` : ''}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2 flex-wrap">
                {o.statut === 'Brouillon' && (
                  <AppButton size="sm" variant="outline" onClick={() => updateStatut(o.id, 'Commandé')}>Commander</AppButton>
                )}
                {(o.statut === 'Commandé' || o.statut === 'Reçu partiel') && (
                  <AppButton size="sm" className="gap-1" disabled={receivingId === o.id} onClick={() => receive(o.id)}><PackageCheck size={14} /> {receivingId === o.id ? 'Réception…' : 'Réceptionner'}</AppButton>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AppFormModal
        open={showForm}
        onOpenChange={setShowForm}
        title="Nouvel achat"
        description="Commande fournisseur liée au stock — réception sync matières."
        maxWidthClass="max-w-lg"
        className="orion-achat-modal max-h-[90vh] overflow-y-auto"
        footer={(
          <>
            <AppButton type="button" variant="outline" onClick={() => setShowForm(false)} disabled={saving}>
              Annuler
            </AppButton>
            <AppButton type="button" onClick={create} disabled={saving}>
              {saving ? 'Création…' : 'Créer l’achat'}
            </AppButton>
          </>
        )}
      >
        <div className="orion-achat-form">
          <div className="orion-achat-field">
            <label className="orion-achat-label" htmlFor="achat-supplier">Fournisseur *</label>
            <FilterSelect
              id="achat-supplier"
              value={form.supplierId}
              onChange={(v) => setForm((f) => ({ ...f, supplierId: v }))}
              className="w-full"
              aria-label="Fournisseur"
            >
              <option value="">Sélectionner…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </FilterSelect>
          </div>

          <div className="orion-achat-section">
            <p className="orion-achat-section-title">Article stock</p>
            <div className="orion-achat-field">
              <label className="orion-achat-label" htmlFor="achat-stock-q">Recherche SKU</label>
              <SearchInput
                id="achat-stock-q"
                value={stockQuery}
                onChange={setStockQuery}
                placeholder="SKU ou libellé (min. 2 car.)…"
                debounceMs={0}
              />
            </div>
            <div className="orion-achat-field">
              <label className="orion-achat-label" htmlFor="achat-stock">Article (recommandé)</label>
              <FilterSelect
                id="achat-stock"
                value={form.stockItemId}
                onChange={onStockSelect}
                className="w-full"
                aria-label="Article stock"
              >
                <option value="">Sans SKU — saisie libre</option>
                {stockItems.map((s) => (
                  <option key={s.id} value={s.id}>{s.sku} — {s.label}</option>
                ))}
              </FilterSelect>
            </div>
            <div className="orion-achat-field">
              <label className="orion-achat-label" htmlFor="achat-label">Libellé ligne *</label>
              <input
                id="achat-label"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                className="orion-achat-input"
                placeholder="Ex. Papier couché 300g A4"
              />
            </div>
          </div>

          <div className="orion-achat-section">
            <p className="orion-achat-section-title">Quantité & coût</p>
            <div className="orion-achat-grid">
              <div className="orion-achat-field">
                <label className="orion-achat-label" htmlFor="achat-qty">Quantité</label>
                <input
                  id="achat-qty"
                  type="number"
                  min={0}
                  value={form.qty}
                  onChange={(e) => setForm((f) => ({ ...f, qty: +e.target.value }))}
                  className="orion-achat-input"
                />
              </div>
              <div className="orion-achat-field">
                <label className="orion-achat-label" htmlFor="achat-unit">Unité achat</label>
                <FilterSelect
                  id="achat-unit"
                  value={form.purchaseUnit}
                  onChange={(v) => setForm((f) => ({ ...f, purchaseUnit: v }))}
                  className="w-full"
                  aria-label="Unité d’achat"
                  options={STOCK_UNIT_DISPLAY_OPTIONS.map((u) => ({ value: u, label: u }))}
                />
              </div>
            </div>
            <div className="orion-achat-field">
              <label className="orion-achat-label" htmlFor="achat-conv">Conversion stock</label>
              <input
                id="achat-conv"
                type="number"
                min={0}
                value={form.conversionFactor}
                onChange={(e) => setForm((f) => ({ ...f, conversionFactor: e.target.value }))}
                className="orion-achat-input"
                placeholder="Ex. 500 feuilles / rame"
              />
            </div>
            <div className="orion-achat-field">
              <label className="orion-achat-label" htmlFor="achat-cost">Prix unitaire (Ar)</label>
              <input
                id="achat-cost"
                type="number"
                min={0}
                value={form.unitCost}
                onChange={(e) => setForm((f) => ({ ...f, unitCost: +e.target.value }))}
                className="orion-achat-input"
              />
            </div>
          </div>

          <p className="orion-achat-hint">
            À la réception : entrée stock, mouvement, prix d’achat et sync matières liée.
          </p>
        </div>
      </AppFormModal>
    </EntityListPageShell>
  );
}
