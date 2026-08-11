'use client';

import { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { Package, AlertTriangle, Plus, ArrowDown, ArrowUp, RefreshCw, History, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { uxToast } from '@/lib/ux/feedback';
import {
  AppButton, AppKpiCard, AppFormModal, AppFormModalFooter, AppListSkeleton, AppLoadingState, AppListPagination,
  AppResponsiveKpiGrid, AppResponsiveDataView, AppDataListRow, AppStickyActionBar,
  EntityModuleDataBar,
} from '@/components/ui/app-ui';
import { StockItemCompleteModal, type StockCompleteFormState } from '@/components/stock/StockItemCompleteModal';
import { StockWorkspaceTabs } from '@/components/stock/StockWorkspaceTabs';
import { StockInventairePanel } from '@/components/stock/StockInventairePanel';
import { OrionPageHeader, OrionEmptyState, OrionColumnTable } from '@/components/orion';
import { OrionErrorBoundary } from '@/components/shared/orion-error-boundary';
import { unwrapApiData, unwrapListItems } from '@/lib/api-client';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useCommandeDeepLink } from '@/lib/hooks/use-commande-deep-link';
import { useOrionLiveRevision } from '@/lib/hooks/use-orion-live-revision';
import { liveFetch, emitOrionLive } from '@/lib/live/orion-live';
import { CommandeDeepLinkBanner } from '@/components/commandes/commande-deep-link-banner';
import Link from 'next/link';
import { FlowPageBanner } from '@/components/flow/flow-page-banner';
import { StockCategoryBadge, STOCK_CATEGORIES } from '@/components/stock/StockCategoryBadge';
import { StockTableToolbar, type StockFilterChip, type StockSortId } from '@/components/stock/StockTableToolbar';
import type { ColumnPriority } from '@/lib/responsive/types';

type StockItem = {
  id: string; sku: string; label: string; category: string;
  stockCategory?: string;
  paperType: string | null; grammage: string | null;
  quantity: number; minQty: number; unit: string;
  unitDisplay?: string | null;
  conversionFactor?: number | null;
  salePrice?: number | null;
  unitCost?: number | null;
  baseMaterialId?: string | null;
  vendableDirectement?: boolean;
  reservedQty?: number;
  _count?: { movements: number };
};

type StockMovement = {
  id: string;
  type: string;
  quantity: number;
  balanceAfter: number;
  notes: string | null;
  userName: string | null;
  createdAt: string;
};

type StockDetail = StockItem & {
  movements: StockMovement[];
  unitCost?: number | null;
  supplier?: string | null;
  reservedQty?: number;
};


type SupplierOption = { id: string; name: string };
type GlobalMovement = {
  id: string; type: string; quantity: number; balanceAfter: number; notes: string | null;
  createdAt: string;
  stockItem?: { sku: string; label: string; unit?: string };
};
type StockAnomalyRow = { code: string; level: string; message: string; sku?: string; label?: string };

export default function StockPageWrapper() {
  return (
    <Suspense fallback={<AppListSkeleton rows={6} />}>
      <StockPage />
    </Suspense>
  );
}

function StockPage() {
  const searchParams = useSearchParams();
  const { commandeId, info: commandeInfo } = useCommandeDeepLink();
  const liveTick = useOrionLiveRevision(['stock', 'pricing', 'catalogue', 'sync'], {
    debounceMs: 300,
    focusMinMs: 15_000,
  });
  const [items, setItems] = useState<StockItem[]>([]);
  const [stats, setStats] = useState({ total: 0, critical: 0, outOfStock: 0 });
  const [commandeReservations, setCommandeReservations] = useState<{
    id: string;
    quantity: number;
    availableQty?: number;
    unit?: string | null;
    stockItem?: {
      label: string;
      quantity?: number;
      reservedQty?: number | null;
      unit?: string | null;
    };
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 50;
  const [filter, setFilter] = useState('');
  const [activeChip, setActiveChip] = useState<StockFilterChip>('all');
  const [sort, setSort] = useState<StockSortId>('label-asc');
  const tab = searchParams.get('tab') || '';
  const [showNew, setShowNew] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [movements, setMovements] = useState<GlobalMovement[]>([]);
  const [anomalies, setAnomalies] = useState<StockAnomalyRow[]>([]);
  const [detail, setDetail] = useState<StockDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [moveModal, setMoveModal] = useState<{ id: string; label: string; type: 'entree' | 'sortie' } | null>(null);
  const [moveQty, setMoveQty] = useState(1);
  const [detailTab, setDetailTab] = useState<'infos' | 'mouvements' | 'fournisseur' | 'parametres'>('infos');
  const [detailEdit, setDetailEdit] = useState({ minQty: 0, unitCost: '', supplier: '', unit: 'feuille' });
  const [moveMotif, setMoveMotif] = useState('Utilisation production');
  const debouncedFilter = useDebounce(filter, 300);

  const stockCategoryFilter = STOCK_CATEGORIES.some((c) => c.id === activeChip) ? activeChip : '';
  const showCritical = activeChip === 'critical';
  const showOutOfStock = activeChip === 'outOfStock';
  const linkedMaterialFilter = activeChip === 'unlinked' ? 'no' : '';

  const load = useCallback(async () => {
    void liveTick;
    setLoading(true);
    try {
      const p = new URLSearchParams();
      p.set('page', String(page));
      p.set('pageSize', String(pageSize));
      if (showCritical) p.set('critical', 'true');
      if (showOutOfStock) p.set('outOfStock', 'true');
      if (stockCategoryFilter) p.set('stockCategory', stockCategoryFilter);
      if (linkedMaterialFilter) p.set('linkedMaterial', linkedMaterialFilter);
      if (debouncedFilter.trim()) p.set('search', debouncedFilter.trim());
      if (showTrash) p.set('archived', '1');
      const r = await fetch(`/api/stock?${p}`);
      if (r.ok) {
        const d = unwrapApiData<{
          items: StockItem[];
          stats: typeof stats;
          total?: number;
          totalPages?: number;
        }>(await r.json());
        setItems(d.items);
        setStats(d.stats);
        if (typeof d.total === 'number') {
          setTotalItems(d.total);
          setTotalPages(d.totalPages ?? Math.max(1, Math.ceil(d.total / pageSize)));
        } else {
          setTotalItems(d.items?.length ?? 0);
          setTotalPages(1);
        }
      }
    } catch {
      uxToast.error('Erreur chargement stock');
    } finally {
      setLoading(false);
    }
  }, [showCritical, showOutOfStock, stockCategoryFilter, linkedMaterialFilter, debouncedFilter, page, pageSize, liveTick, showTrash]);

  useEffect(() => { setPage(1); }, [showCritical, showOutOfStock, stockCategoryFilter, linkedMaterialFilter, debouncedFilter, showTrash]);

  const sortedItems = useMemo(() => {
    const list = [...items];
    switch (sort) {
      case 'label-asc':
        list.sort((a, b) => a.label.localeCompare(b.label, 'fr'));
        break;
      case 'label-desc':
        list.sort((a, b) => b.label.localeCompare(a.label, 'fr'));
        break;
      case 'sku-asc':
        list.sort((a, b) => a.sku.localeCompare(b.sku, 'fr'));
        break;
      case 'qty-asc':
        list.sort((a, b) => a.quantity - b.quantity);
        break;
      case 'qty-desc':
        list.sort((a, b) => b.quantity - a.quantity);
        break;
      default:
        break;
    }
    return list;
  }, [items, sort]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (searchParams.get('critical') === '1') setActiveChip('critical');
  }, [searchParams]);

  useEffect(() => {
    if (!commandeId) {
      setCommandeReservations([]);
      return;
    }
    fetch(`/api/commandes/${commandeId}/overview`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        const d = body ? unwrapApiData<{ stockReservations?: typeof commandeReservations }>(body) : null;
        setCommandeReservations(d?.stockReservations ?? []);
      })
      .catch(() => setCommandeReservations([]));
  }, [commandeId]);

  const adjust = async (id: string, type: 'entree' | 'sortie', qty: number, notes?: string) => {
    const r = await liveFetch(`/api/stock/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, quantity: qty, notes: notes ?? undefined }),
    });
    if (r.ok) {
      emitOrionLive('stock', { entityId: id, source: 'adjust' });
      uxToast.success(type === 'entree' ? 'Entrée enregistrée' : 'Sortie enregistrée');
      load();
      if (detail?.id === id) openDetail(id);
      setMoveModal(null);
    }
    else uxToast.error('Erreur ajustement');
  };

  useEffect(() => {
    fetch('/api/suppliers')
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => setSuppliers(body ? unwrapListItems(body) : []))
      .catch(() => {
        console.warn('[stock] fournisseurs indisponibles');
      });
  }, []);

  useEffect(() => {
    if (tab === 'mouvements') {
      fetch('/api/stock/movements?limit=80')
        .then((r) => r.ok ? r.json() : null)
        .then((body) => setMovements(body ? unwrapListItems(body) : []))
        .catch(() => setMovements([]));
    }
    if (tab === 'alertes') {
      fetch('/api/stock/anomalies')
        .then((r) => r.ok ? r.json() : null)
        .then((body) => setAnomalies(body ? unwrapListItems(body) : []))
        .catch(() => setAnomalies([]));
    }
  }, [tab]);

  const createFromComplete = async (form: StockCompleteFormState) => {
    if (!form.label.trim()) {
      uxToast.error('Libellé requis');
      return;
    }
    if (form.skuManual && !form.skuManualReason.trim()) {
      uxToast.error('Justification SKU manuel requise');
      return;
    }
    const r = await liveFetch('/api/stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: form.label,
        sku: form.skuManual && form.sku.trim() ? form.sku.trim() : undefined,
        autoSku: !form.skuManual,
        skuManual: form.skuManual,
        skuManualReason: form.skuManualReason || null,
        stockCategory: form.stockCategory,
        family: form.family,
        subFamily: form.subFamily || null,
        brand: form.brand || null,
        supplierRef: form.supplierRef || null,
        category: form.family || form.category,
        paperType: form.paperType || null,
        grammage: form.grammage || null,
        formatLabel: form.formatLabel || null,
        color: form.color || null,
        thickness: form.thickness || null,
        characteristic: form.sizeLabel || form.capacity || null,
        sizeLabel: form.sizeLabel || null,
        capacity: form.capacity || null,
        machineCompatible: form.machineCompatible || null,
        unit: form.unit,
        unitDisplay: form.unitDisplay || null,
        unitStandard: form.unit,
        conversionFactor: form.conversionFactor ? Number(form.conversionFactor) : null,
        quantity: Number(form.quantity),
        minQty: Number(form.minQty),
        maxQty: form.maxQty ? Number(form.maxQty) : null,
        unitCost: form.unitCost ? Number(form.unitCost) : null,
        additionalCost: form.additionalCost ? Number(form.additionalCost) : null,
        salePrice: form.salePrice ? Number(form.salePrice) : null,
        basePrintPrice: form.basePrintPrice ? Number(form.basePrintPrice) : null,
        maxPrice: form.maxPrice ? Number(form.maxPrice) : null,
        discountPct: form.discountPct ? Number(form.discountPct) : null,
        vatRate: form.vatRate ? Number(form.vatRate) : null,
        vendableDirectement: form.vendableDirectement,
        linkMaterial: form.linkMaterial,
        visiblePos: form.visiblePos,
        impactsPrice: form.impactsPrice,
        impactsStock: form.impactsStock,
        usableProduction: form.usableProduction,
        supplierId: form.supplierId || null,
        site: form.site,
      }),
    });
    const errBody = await r.json().catch(() => ({}));
    if (r.ok) {
      emitOrionLive('stock', { source: 'create' });
      uxToast.success(form.linkMaterial ? 'Stock créé — SKU auto + Matières DB liée (brouillon)' : 'Article stock créé');
      setShowNew(false);
      load();
    } else {
      const msg = typeof errBody.error === 'string' ? errBody.error : errBody.error?.message ?? 'Erreur création';
      uxToast.error(msg);
    }
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetailTab('infos');
    try {
      const r = await fetch(`/api/stock/${id}`);
      if (r.ok) {
        const d = unwrapApiData<StockDetail>(await r.json());
        setDetail(d);
        setDetailEdit({
          minQty: d.minQty ?? 50,
          unitCost: d.unitCost != null ? String(d.unitCost) : '',
          supplier: d.supplier ?? '',
          unit: d.unit ?? 'feuille',
        });
      } else uxToast.error('Impossible de charger l\'historique');
    } finally {
      setDetailLoading(false);
    }
  };

  const saveDetail = async () => {
    if (!detail) return;
    const r = await liveFetch(`/api/stock/${detail.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        minQty: detailEdit.minQty,
        unitCost: detailEdit.unitCost ? Number(detailEdit.unitCost) : null,
        supplier: detailEdit.supplier || null,
        unit: detailEdit.unit,
      }),
    });
    if (r.ok) {
      emitOrionLive('stock', { entityId: detail.id, source: 'saveDetail' });
      uxToast.success('Article mis à jour');
      const updated = unwrapApiData<StockDetail>(await r.json());
      setDetail(updated);
      load();
    } else uxToast.error('Erreur sauvegarde');
  };

  const statusOf = (i: StockItem) => {
    const available = Math.max(0, i.quantity - (i.reservedQty ?? 0));
    if (available <= 0) return { label: 'Rupture', cls: 'bg-red-500/10 text-red-500' };
    if (available <= i.minQty) return { label: 'Critique', cls: 'bg-orange-500/10 text-orange-500' };
    return { label: 'OK', cls: 'bg-green-500/10 text-green-500' };
  };

  return (
    <div className="space-y-6">
      {commandeInfo && <CommandeDeepLinkBanner info={commandeInfo} />}
      {commandeReservations.length > 0 && (
        <div className="bg-card border border-border rounded-[7px] p-4 space-y-2">
          <h3 className="text-sm font-semibold">Réservations liées à la commande</h3>
          {commandeReservations.map((r) => (
            <div key={r.id} className="flex flex-col gap-1 text-xs py-2 border-b border-border/50 last:border-0">
              <span className="font-medium">{r.stockItem?.label ?? 'Article'}</span>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
                <span>Réservé: <strong className="text-amber-600">{r.quantity} {r.unit ?? r.stockItem?.unit ?? ''}</strong></span>
                <span>Disponible: <strong className={(r.availableQty ?? 0) > 0 ? 'text-emerald-600' : 'text-red-500'}>{r.availableQty ?? 0} {r.unit ?? r.stockItem?.unit ?? ''}</strong></span>
              </div>
            </div>
          ))}
          {commandeId && (
            <Link href={`/commandes/${commandeId}`} className="text-[10px] text-[var(--ans-cyan)] hover:underline">
              Fiche commande 360° →
            </Link>
          )}
        </div>
      )}
      <OrionPageHeader
        title="Stock"
        description="Inventaire matières — papier, consommables, alertes critiques"
        syncStatus={loading ? 'queued' : 'synced'}
        syncAsOf={loading ? null : new Date().toISOString()}
        actions={
          <div className="hidden md:flex gap-2 flex-wrap items-center">
            <EntityModuleDataBar
              entity="stock-items"
              trash={showTrash}
              onTrashChange={setShowTrash}
              onAfterImport={load}
            />
            <AppButton variant="outline" size="sm" onClick={load} className="gap-2">
              <RefreshCw size={14} /> Actualiser
            </AppButton>
            <AppButton size="sm" onClick={() => setShowNew(true)} className="gap-2">
              <Plus size={14} /> Nouveau stock / matière
            </AppButton>
          </div>
        }
      />

      <StockWorkspaceTabs />

      {tab === 'inventaire' && (
        <StockInventairePanel onDone={load} />
      )}

      {tab === 'mouvements' && (
        <div className="bg-card border border-border rounded-[7px] p-4 space-y-2">
          <h3 className="text-sm font-semibold">Journal des mouvements</h3>
          {movements.length === 0 ? (
            <OrionEmptyState icon={History} title="Aucun mouvement récent" description="Les entrées et sorties de stock apparaîtront ici." />
          ) : (
            <ul className="text-xs space-y-1 max-h-96 overflow-y-auto">
              {movements.map((m) => (
                <li key={m.id} className="flex flex-wrap gap-2 py-1 border-b border-border/40">
                  <span className="font-mono">{m.stockItem?.sku}</span>
                  <span>{m.type}</span>
                  <span>{m.quantity} {m.stockItem?.unit}</span>
                  <span className="text-muted-foreground">{new Date(m.createdAt).toLocaleString('fr-FR')}</span>
                  {m.notes && <span className="text-muted-foreground">— {m.notes}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'maintenance' && (
        <div className="bg-card border border-border rounded-[7px] p-4">
          <h3 className="text-sm font-semibold mb-2">Maintenance / pièces machines</h3>
          <p className="text-sm text-muted-foreground mb-3">Filtrez par catégorie « Maintenance » pour gérer puces, têtes et kits.</p>
          <AppButton type="button" variant="ghost" size="sm" onClick={() => setActiveChip('maintenance_piece')}>Voir pièces maintenance</AppButton>
        </div>
      )}

      {tab === 'alertes' && (
        <div className="bg-card border border-border rounded-[7px] p-4 space-y-2">
          <h3 className="text-sm font-semibold">Anomalies stock</h3>
          {anomalies.length === 0 ? (
            <OrionEmptyState icon={AlertTriangle} title="Aucune anomalie" description="Le stock est cohérent — aucune alerte détectée pour le moment." />
          ) : (
            <ul className="text-xs space-y-1 max-h-96 overflow-y-auto">
              {anomalies.slice(0, 100).map((a, i) => (
                <li key={`${a.code}-${i}`} className={`py-1 border-b border-border/40 ${a.level === 'critique' ? 'text-red-400' : a.level === 'warning' ? 'text-amber-400' : ''}`}>
                  <strong>{a.sku ?? '—'}</strong> {a.label} — {a.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!tab || tab === 'articles' ? (
      <>
      <FlowPageBanner
        entity="stock"
        status={stats.outOfStock > 0 ? 'rupture' : stats.critical > 0 ? 'faible' : 'OK'}
        impactedModules={['Production', 'Commandes', 'Achats']}
      />

      <AppResponsiveKpiGrid columns={4} phoneMax={3}>
        <AppKpiCard label="Articles" value={stats.total} icon={Package} tone="brand" />
        <AppKpiCard label="Stock critique" value={stats.critical} icon={AlertTriangle} tone="gold" />
        <AppKpiCard label="Ruptures" value={stats.outOfStock} icon={AlertTriangle} tone="danger" />
      </AppResponsiveKpiGrid>

      <StockTableToolbar
        count={sortedItems.length}
        search={filter}
        onSearchChange={setFilter}
        sort={sort}
        onSortChange={setSort}
        activeChip={activeChip}
        onChipChange={setActiveChip}
      />

      <OrionErrorBoundary zone="stock">
      {loading ? (
        <AppListSkeleton rows={6} />
      ) : sortedItems.length === 0 ? (
        <OrionEmptyState icon={Package} title="Aucun article en stock" description="Les matières papier apparaîtront après le seed ou une entrée manuelle." />
      ) : (
        <AppResponsiveDataView
          data={sortedItems}
          rowKey={(item) => item.id}
          caption="Articles stock"
          columns={[
            { id: 'sku', label: 'SKU', phone: 'critical', tablet: 'critical', desktop: 'critical', cardField: true },
            { id: 'label', label: 'Libellé', phone: 'primary', tablet: 'primary', desktop: 'primary', cardField: true },
            { id: 'quantity', label: 'Qté', phone: 'primary', tablet: 'primary', desktop: 'primary', cardField: true },
            { id: 'statut', label: 'Statut', phone: 'primary', tablet: 'primary', desktop: 'primary', cardField: true },
            { id: 'stockCategory', label: 'Catégorie', phone: 'secondary', tablet: 'secondary', desktop: 'secondary' },
          ] satisfies ColumnPriority[]}
          renderCard={(item) => {
            const st = statusOf(item);
            return (
              <AppDataListRow
                onClick={() => openDetail(item.id)}
                title={(
                  <>
                    <span className="font-mono text-xs text-muted-foreground">{item.sku}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                  </>
                )}
                subtitle={<span className="font-medium">{item.label}</span>}
                meta={(
                  <>
                    <StockCategoryBadge category={item.stockCategory ?? 'matiere_interne'} />
                    {' · '}
                    {Math.floor(item.quantity)} {item.unit}
                  </>
                )}
                trailing={(
                  <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <AppButton type="button" variant="ghost" size="icon" onClick={() => { setMoveModal({ id: item.id, label: item.label, type: 'entree' }); setMoveQty(10); }} title="Entrée stock" className="text-green-600 hover:bg-green-500/10 min-h-[44px] min-w-[44px]">
                      <ArrowDown size={16} />
                    </AppButton>
                    <AppButton type="button" variant="ghost" size="icon" onClick={() => { setMoveModal({ id: item.id, label: item.label, type: 'sortie' }); setMoveQty(1); }} title="Sortie stock" className="text-red-500 hover:bg-red-500/10 min-h-[44px] min-w-[44px]">
                      <ArrowUp size={16} />
                    </AppButton>
                  </div>
                )}
              />
            );
          }}
          renderTable={() => (
        <OrionColumnTable
          data={sortedItems}
          rowKey={(item) => item.id}
          enableSorting
          virtualizeThreshold={50}
          columns={[
            {
              id: 'sku',
              accessorKey: 'sku',
              enableSorting: true,
              header: 'SKU',
              cell: (item) => <span className="font-mono text-xs">{item.sku}</span>,
            },
            {
              id: 'label',
              accessorKey: 'label',
              enableSorting: true,
              header: 'Libellé',
              cell: (item) => <span className="font-medium">{item.label}</span>,
            },
            {
              id: 'stockCategory',
              header: 'Catégorie',
              cell: (item) => <StockCategoryBadge category={item.stockCategory ?? 'matiere_interne'} />,
            },
            {
              id: 'matiere',
              header: 'Matière',
              className: 'text-muted-foreground hidden md:table-cell',
              headerClassName: 'hidden md:table-cell',
              cell: (item) => [item.paperType, item.grammage].filter(Boolean).join(' · ') || '—',
            },
            {
              id: 'quantity',
              accessorKey: 'quantity',
              enableSorting: true,
              header: 'Qté',
              headerClassName: 'text-right',
              className: 'text-right font-semibold',
              cell: (item) => `${Math.floor(item.quantity)} ${item.unit}`,
            },
            {
              id: 'reservedQty',
              accessorKey: 'reservedQty',
              header: 'Réservé',
              headerClassName: 'text-right hidden lg:table-cell',
              className: 'text-right text-amber-600 hidden lg:table-cell',
              cell: (item) =>
                Math.floor(item.reservedQty ?? 0) > 0
                  ? `${Math.floor(item.reservedQty ?? 0)} ${item.unit}`
                  : '—',
            },
            {
              id: 'availableQty',
              header: 'Disponible',
              headerClassName: 'text-right hidden md:table-cell',
              className: 'text-right font-semibold hidden md:table-cell',
              cell: (item) => {
                const available = Math.max(0, item.quantity - (item.reservedQty ?? 0));
                return (
                  <span className={available > item.minQty ? 'text-emerald-600' : available > 0 ? 'text-orange-500' : 'text-red-500'}>
                    {available} {item.unit}
                  </span>
                );
              },
            },
            {
              id: 'minQty',
              accessorKey: 'minQty',
              enableSorting: true,
              header: 'Seuil',
              headerClassName: 'text-right hidden sm:table-cell',
              className: 'text-right text-muted-foreground hidden sm:table-cell',
              cell: (item) => Math.floor(item.minQty),
            },
            {
              id: 'statut',
              header: 'Statut',
              headerClassName: 'text-center',
              className: 'text-center',
              cell: (item) => {
                const st = statusOf(item);
                return (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>
                    {st.label}
                  </span>
                );
              },
            },
            {
              id: 'actions',
              header: 'Actions',
              headerClassName: 'text-right',
              className: 'text-right',
              cell: (item) => (
                <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  <AppButton type="button" variant="ghost" size="icon" onClick={() => openDetail(item.id)} title="Historique" className="text-muted-foreground">
                    <History size={16} />
                  </AppButton>
                  <AppButton type="button" variant="ghost" size="icon" onClick={() => { setMoveModal({ id: item.id, label: item.label, type: 'entree' }); setMoveQty(10); }} title="Entrée stock" className="text-green-600 hover:bg-green-500/10">
                    <ArrowDown size={16} />
                  </AppButton>
                  <AppButton type="button" variant="ghost" size="icon" onClick={() => { setMoveModal({ id: item.id, label: item.label, type: 'sortie' }); setMoveQty(1); }} title="Sortie stock" className="text-red-500 hover:bg-red-500/10">
                    <ArrowUp size={16} />
                  </AppButton>
                </div>
              ),
            },
          ]}
        />
          )}
        />
      )}
      <AppListPagination page={page} totalPages={totalPages} total={totalItems} onPageChange={setPage} />
      </OrionErrorBoundary>
      </>
      ) : null}

      <StockItemCompleteModal
        open={showNew}
        onOpenChange={setShowNew}
        suppliers={suppliers}
        onSubmit={createFromComplete}
      />

      <AppFormModal
        open={!!moveModal}
        onOpenChange={(o) => !o && setMoveModal(null)}
        title={moveModal?.type === 'entree' ? 'Nouvelle entrée stock' : 'Sortie de stock'}
        footer={
          moveModal ? (
            <AppFormModalFooter
              onCancel={() => setMoveModal(null)}
              onSubmit={() => adjust(moveModal.id, moveModal.type, moveQty, moveModal.type === 'sortie' ? moveMotif : undefined)}
              submitLabel="Confirmer"
              submitVariant={moveModal.type === 'sortie' ? 'destructive' : 'default'}
            />
          ) : null
        }
      >
        {moveModal && (
          <>
            <p className="text-sm text-muted-foreground">{moveModal.label}</p>
            <label className="block text-xs font-bold">Quantité
              <input type="number" min={1} className="fc mt-1" value={moveQty} onChange={(e) => setMoveQty(Number(e.target.value))} />
            </label>
            {moveModal.type === 'sortie' && (
              <label className="block text-xs font-bold">Motif
                <select className="fc mt-1" value={moveMotif} onChange={(e) => setMoveMotif(e.target.value)}>
                  {['Utilisation production', 'Vente directe', 'Perte/Casse', 'Autre'].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>
            )}
          </>
        )}
      </AppFormModal>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-backdrop backdrop-blur-sm" onClick={() => setDetail(null)} />
          <div className="relative bg-card border border-border rounded-t-[7px] sm:rounded-[7px] p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-display font-bold">{detail.label}</h4>
                <p className="text-xs font-mono text-muted-foreground">{detail.sku} · {detail.category}</p>
              </div>
              <AppButton type="button" variant="ghost" size="icon" onClick={() => setDetail(null)} aria-label="Fermer">
                <X size={18} />
              </AppButton>
            </div>

            <div className="flex gap-1 border-b border-border pb-2 mb-4 flex-wrap">
              {(['infos', 'mouvements', 'fournisseur', 'parametres'] as const).map((t) => (
                <AppButton
                  key={t}
                  type="button"
                  size="sm"
                  variant={detailTab === t ? 'default' : 'ghost'}
                  onClick={() => setDetailTab(t)}
                  className="text-xs"
                >
                  {t === 'infos' ? 'ℹ Infos' : t === 'mouvements' ? '📋 Mouvements' : t === 'fournisseur' ? '🏭 Fournisseur' : '⚙ Paramètres'}
                </AppButton>
              ))}
            </div>

            {detailTab === 'infos' && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="ans-card-premium p-3 text-center">
                    <p className="text-2xl font-bold">{Math.floor(detail.quantity)}</p>
                    <p className="text-xs text-muted-foreground">Stock {detail.unit}</p>
                  </div>
                  <div className="ans-card-premium p-3 text-center">
                    <p className="text-2xl font-bold text-orange-500">{Math.floor(detail.minQty)}</p>
                    <p className="text-xs text-muted-foreground">Seuil min</p>
                  </div>
                </div>
                <p className="text-xs"><strong>Matière :</strong> {[detail.paperType, detail.grammage].filter(Boolean).join(' · ') || '—'}</p>
                <p className="text-xs"><strong>Réservé :</strong> {Math.floor(detail.reservedQty ?? 0)} {detail.unit}</p>
                <p className="text-xs"><strong>Coût unitaire :</strong> {detail.unitCost != null ? `${detail.unitCost.toLocaleString('fr-FR')} MGA` : '—'}</p>
                <div className="flex gap-2 pt-2">
                  <AppButton size="sm" className="flex-1 gap-1" onClick={() => { setMoveModal({ id: detail.id, label: detail.label, type: 'entree' }); setMoveQty(10); }}>
                    <ArrowDown size={14} /> Entrée
                  </AppButton>
                  <AppButton size="sm" variant="outline" className="flex-1 gap-1 text-red-600" onClick={() => { setMoveModal({ id: detail.id, label: detail.label, type: 'sortie' }); setMoveQty(1); }}>
                    <ArrowUp size={14} /> Sortie
                  </AppButton>
                </div>
              </div>
            )}

            {detailTab === 'mouvements' && (
              <div>
                <h5 className="text-xs font-bold uppercase text-muted-foreground mb-2">Historique ({detail.movements.length})</h5>
                {detailLoading ? (
                  <AppLoadingState message="Chargement…" size="sm" />
                ) : detail.movements.length === 0 ? (
                  <OrionEmptyState icon={History} title="Aucun mouvement" description="Aucun mouvement enregistré pour cet article." />
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {detail.movements.map((m) => (
                      <div key={m.id} className="flex justify-between items-start text-xs border border-border rounded-[7px] p-2">
                        <div>
                          <span className={`font-bold uppercase ${m.type === 'entree' ? 'text-green-600' : 'text-red-500'}`}>{m.type}</span>
                          <span className="ml-2 font-mono">× {m.quantity}</span>
                          {m.notes && <p className="text-muted-foreground mt-0.5">{m.notes}</p>}
                          <p className="text-muted-foreground mt-0.5">{m.userName || 'Système'} · {new Date(m.createdAt).toLocaleString('fr-FR')}</p>
                        </div>
                        <span className="font-mono text-muted-foreground">→ {Math.floor(m.balanceAfter)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {detailTab === 'fournisseur' && (
              <div className="space-y-3 text-sm">
                <label className="block text-xs font-bold">Fournisseur principal
                  <input className="fc mt-1" value={detailEdit.supplier} onChange={(e) => setDetailEdit({ ...detailEdit, supplier: e.target.value })} placeholder="Nom fournisseur" />
                </label>
                <label className="block text-xs font-bold">Coût d&apos;achat unitaire (MGA)
                  <input type="number" className="fc mt-1" value={detailEdit.unitCost} onChange={(e) => setDetailEdit({ ...detailEdit, unitCost: e.target.value })} />
                </label>
                <p className="text-xs text-muted-foreground">Les prix fournisseurs détaillés sont synchronisés depuis l&apos;import fusion métier Excel.</p>
                <AppButton size="sm" onClick={saveDetail}>Enregistrer fournisseur</AppButton>
              </div>
            )}

            {detailTab === 'parametres' && (
              <div className="space-y-3 text-sm">
                <label className="block text-xs font-bold">Seuil minimum (alerte)
                  <input type="number" min={0} className="fc mt-1" value={detailEdit.minQty} onChange={(e) => setDetailEdit({ ...detailEdit, minQty: Number(e.target.value) })} />
                </label>
                <label className="block text-xs font-bold">Unité de mesure
                  <select className="fc mt-1" value={detailEdit.unit} onChange={(e) => setDetailEdit({ ...detailEdit, unit: e.target.value })}>
                    {['feuille', 'rouleau', 'kg', 'L', 'pièce', 'm²'].map((u) => <option key={u}>{u}</option>)}
                  </select>
                </label>
                <AppButton size="sm" onClick={saveDetail}>Enregistrer paramètres</AppButton>
              </div>
            )}
          </div>
        </div>
      )}
      <AppStickyActionBar>
        <AppButton type="button" onClick={() => setShowNew(true)}>
          <Plus size={16} className="mr-1.5" /> Nouveau
        </AppButton>
        <AppButton type="button" variant="outline" onClick={load}>
          <RefreshCw size={16} className="mr-1.5" /> Actualiser
        </AppButton>
      </AppStickyActionBar>
    </div>
  );
}
