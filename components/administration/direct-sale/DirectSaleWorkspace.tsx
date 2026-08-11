'use client';


import { AppButton } from '@/components/ui/app-ui';
import { LoadingState } from '@/components/ui/loading-state';
import { useCallback, useEffect, useRef, useState, Fragment } from 'react';
import Link from 'next/link';
import {
  Download, Upload, RefreshCw, Store, CheckCircle2, Puzzle, Layers, ChevronDown, ChevronRight,
} from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { DIRECT_SALE_CATEGORIES, normalizeDirectSaleCategory } from '@/lib/direct-sale/categories';
import { CAT_LABELS } from '@/lib/data/catalogue';
import { DIRECT_SALE_EXCEL_COLUMNS } from '@/lib/backoffice/direct-sale-excel-format';
import { exportGenericRowsToXlsx, parseXlsxFile } from '@/lib/admin/excel-table';
import { formatPrice } from '@/lib/data/catalogue';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DirectSaleAddonsPanel } from '@/components/administration/direct-sale/DirectSaleAddonsPanel';
import { DirectSaleTiersPanel } from '@/components/administration/direct-sale/DirectSaleTiersPanel';
import {
  formatTierDiscount,
  formatTierQtyRange,
} from '@/lib/direct-sale/tier-labels';
import { AdminTableViewTabs } from '@/components/admin/AdminTableViewTabs';
import { AdminHistoriquePlaceholder } from '@/components/admin/AdminHistoriquePlaceholder';
import { AdminRowActions, AdminActionsColumnHeader } from '@/components/admin/AdminRowActions';
import {
  InlineEditableCell,
} from '@/components/admin/catalogue-prix-stock';
import '@/components/backoffice-v2/admin-backoffice.css';

type DirectSaleRow = {
  id: string;
  excelId: string | null;
  name: string;
  category: string;
  subCategory: string | null;
  reference: string | null;
  unitPrice: number;
  unit: string;
  minQuantity: number;
  materialKey: string | null;
  isCustomizable: boolean;
  requiresQuoteIfCustom: boolean;
  visiblePOS: boolean;
  status: string;
  description: string | null;
  priceTiers: {
    id: string;
    minQty: number;
    maxQty: number | null;
    discountType: string;
    discountValue: number;
    finalUnitPrice: number | null;
    label: string | null;
  }[];
  _count?: { addons: number };
};

type Props = { canEdit: boolean };

type ViewTab = 'liste' | 'corbeille' | 'historique';

const VIEW_TABS = [
  { id: 'liste' as const, label: 'Articles' },
  { id: 'corbeille' as const, label: 'Corbeille' },
  { id: 'historique' as const, label: 'Historique' },
];

export function DirectSaleWorkspace({ canEdit }: Props) {
  const [view, setView] = useState<ViewTab>('liste');
  const [rows, setRows] = useState<DirectSaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [addonsArticle, setAddonsArticle] = useState<DirectSaleRow | null>(null);
  const [tiersArticle, setTiersArticle] = useState<DirectSaleRow | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin-backoffice/direct-sale/articles', { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Chargement impossible');
      setRows(d.data.rows ?? []);
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const syncAll = async () => {
    setSyncing(true);
    try {
      const r = await fetch('/api/admin-backoffice/direct-sale/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Sync impossible');
      const total = d.data.total ?? d.data.directSale ?? 0;
      uxToast.success(`Sync POS : ${total} ligne(s) (articles + finitions + GF + design)`);
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur sync');
    } finally {
      setSyncing(false);
    }
  };

  const updatePrice = async (id: string, unitPrice: number) => {
    try {
      const r = await fetch(`/api/admin-backoffice/direct-sale/articles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitPrice, action: 'sync' }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Mise à jour impossible');
      uxToast.success('Prix mis à jour et synchronisé POS');
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
      throw e;
    }
  };

  const publish = async (id: string) => {
    try {
      const r = await fetch(`/api/admin-backoffice/direct-sale/articles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Publication impossible');
      uxToast.success('Article publié et synchronisé POS');
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const archive = async (id: string) => {
    try {
      const r = await fetch(`/api/admin-backoffice/direct-sale/articles/${id}`, { method: 'DELETE' });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Archivage impossible');
      uxToast.success('Article archivé');
      setArchiveId(null);
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const exportExcel = async () => {
    try {
      const r = await fetch('/api/admin-backoffice/direct-sale/articles/export-excel');
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error('Export impossible');
      exportGenericRowsToXlsx(d.data.rows, DIRECT_SALE_EXCEL_COLUMNS, 'articles-vente-directe', 'Vente directe');
      uxToast.success('Export Excel téléchargé');
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Export impossible');
    }
  };

  const importExcel = async (file: File) => {
    try {
      const parsed = await parseXlsxFile(file);
      const r = await fetch('/api/admin-backoffice/direct-sale/articles/import-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsed, fileName: file.name }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Import impossible');
      const rep = d.data;
      uxToast.success(
        `Import : ${rep.created} créé(s), ${rep.updated} MAJ, ${rep.synced} sync POS, ${rep.errors} erreur(s)`,
      );
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Import impossible');
    }
  };

  const categoryLabel = (id: string) => {
    const n = normalizeDirectSaleCategory({ category: id });
    return CAT_LABELS[n.categoryId] ?? DIRECT_SALE_CATEGORIES.find((c) => c.id === id)?.label ?? id;
  };

  const activeRows = rows.filter((r) => r.status !== 'archived');
  const archivedRows = rows.filter((r) => r.status === 'archived');
  const displayRows = view === 'corbeille' ? archivedRows : activeRows;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-bold">Articles vente directe</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Prix unitaires standards — sync POS Commercial.{' '}
            <Link href="/administration/tampons" className="text-primary underline-offset-2 hover:underline">
              Tampons
            </Link>
            {' · '}
            <Link href="/administration/photobook" className="text-primary underline-offset-2 hover:underline">
              Photobook
            </Link>
            {' · '}
            <Link href="/administration/tirage-photo" className="text-primary underline-offset-2 hover:underline">
              Tirage photo
            </Link>
            {' · '}
            <Link href="/administration/cadre-photo" className="text-primary underline-offset-2 hover:underline">
              Cadre photo
            </Link>
            {' — '}paliers de remise selon la quantité au panier.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AppButton type="button" onClick={() => void load()}  variant="outline" className="text-sm">
            <RefreshCw size={14} /> Actualiser
          </AppButton>
          <AppButton type="button" onClick={() => void exportExcel()}  variant="outline" className="text-sm">
            <Download size={14} /> Export Excel
          </AppButton>
          {canEdit && (
            <>
              <AppButton
                type="button"
                onClick={() => fileRef.current?.click()}
                 variant="outline" className="text-sm"
              >
                <Upload size={14} /> Import Excel
              </AppButton>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void importExcel(f);
                  e.target.value = '';
                }}
              />
              <AppButton
                type="button"
                disabled={syncing}
                onClick={() => void syncAll()}
                 variant="default" className="text-sm"
              >
                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                Sync POS
              </AppButton>
            </>
          )}
        </div>
      </div>

      <AdminTableViewTabs
        tabs={VIEW_TABS}
        value={view}
        onChange={setView}
        ariaLabel="Navigation vente directe"
      />

      {view === 'historique' ? (
        <AdminHistoriquePlaceholder entityLabel="articles vente directe" entityCode="DirectSaleArticle" />
      ) : (
      <>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] uppercase text-muted-foreground font-bold">Articles</p>
          <p className="text-2xl font-bold">{activeRows.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] uppercase text-muted-foreground font-bold">Actifs POS</p>
          <p className="text-2xl font-bold text-[#10B981]">
            {activeRows.filter((r) => r.status === 'published' && r.visiblePOS).length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] uppercase text-muted-foreground font-bold">À corriger</p>
          <p className="text-2xl font-bold text-amber-600">
            {activeRows.filter((r) => r.status === 'draft').length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] uppercase text-muted-foreground font-bold">Avec paliers</p>
          <p className="text-2xl font-bold">{activeRows.filter((r) => r.priceTiers.length > 0).length}</p>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Colonnes Excel : {DIRECT_SALE_EXCEL_COLUMNS.join(' · ')}
      </p>

      {loading ? (
        <LoadingState message="Chargement…" size="sm" />
      ) : displayRows.length === 0 ? (
        <div className="rounded-[7px] border border-dashed border-border p-12 text-center">
          <Store size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold">
            {view === 'corbeille' ? 'Corbeille vide' : 'Aucun article vente directe'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {view === 'corbeille'
              ? 'Les articles archivés apparaissent ici.'
              : 'Importez un fichier Excel ou créez un article.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[7px] border border-border">
          <table className="w-full text-sm">
            <thead className="bg-accent/50 text-[10px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Article</th>
                <th className="px-3 py-2 text-left">Catégorie</th>
                <th className="px-3 py-2 text-left">Réf.</th>
                <th className="px-3 py-2 text-right">Prix unit.</th>
                <th className="px-3 py-2 text-center">Paliers</th>
                <th className="px-3 py-2 text-center">POS</th>
                <th className="px-3 py-2 text-center">Statut</th>
                <AdminActionsColumnHeader />
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row) => {
                const expanded = expandedId === row.id;
                return (
                <Fragment key={row.id}>
                <tr className="border-t border-border hover:bg-accent/30">
                  <td className="px-3 py-2 font-mono text-xs">
                    <AppButton
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-primary"
                      onClick={() => setExpandedId(expanded ? null : row.id)}
                      title={expanded ? 'Masquer paliers' : 'Voir tableau de prix'}
                    >
                      {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      {row.excelId ?? '—'}
                    </AppButton>
                  </td>
                  <td className="px-3 py-2 font-medium">{row.name}</td>
                  <td className="px-3 py-2 text-xs">{categoryLabel(row.category)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.reference ?? '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <InlineEditableCell
                        type="number"
                        value={row.unitPrice}
                        canEdit={canEdit && view === 'liste'}
                        displayClassName="font-mono text-xs tabular-nums"
                        formatDisplay={(v) => `${formatPrice(Number(v))} Ar`}
                        onSave={async (next) => {
                          const n = Number(next);
                          if (!(n > 0)) throw new Error('Prix invalide');
                          await updatePrice(row.id, n);
                        }}
                      />
                      {row.priceTiers.length > 0 ? (
                        <span className="text-[10px] text-gray-500">
                          {row.priceTiers.length} palier{row.priceTiers.length > 1 ? 's' : ''}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {row.priceTiers.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setTiersArticle(row)}
                        className="text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20"
                      >
                        {row.priceTiers.length} palier{row.priceTiers.length > 1 ? 's' : ''}
                      </button>
                    ) : canEdit ? (
                      <button
                        type="button"
                        onClick={() => setTiersArticle(row)}
                        className="text-xs text-muted-foreground hover:text-primary underline"
                      >
                        + paliers
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {row.visiblePOS ? (
                      <span className="text-[#10B981] text-xs font-bold">Oui</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">Non</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      row.status === 'published'
                        ? 'bg-[#10B981]/15 text-[#10B981]'
                        : row.status === 'archived'
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-amber-500/15 text-amber-700'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="orion-admin-actions-td px-3 py-2">
                    <div className="inline-flex justify-center gap-1 flex-wrap">
                      {row.reference && view === 'liste' ? (
                        <AppButton variant="outline" className="text-[10px] py-1 px-2" asChild>
              <Link
                          href={`/pos/${row.reference}`}
                          
                          target="_blank"
                        >
                          <Store size={12} /> POS
                        </Link>
            </AppButton>
                      ) : null}
                      {canEdit && view === 'liste' ? (
                        <>
                          <AppButton
                            type="button"
                            variant="outline"
                            className="text-[10px] py-1 px-2"
                            onClick={() => setTiersArticle(row)}
                          >
                            <Layers size={12} /> Paliers
                          </AppButton>
                          <AppButton
                            type="button"
                            onClick={() => setAddonsArticle(row)}
                             variant="outline" className="text-[10px] py-1 px-2"
                          >
                            <Puzzle size={12} /> +{row._count?.addons ?? 0}
                          </AppButton>
                          {row.status !== 'published' ? (
                            <AppButton
                              type="button"
                              onClick={() => void publish(row.id)}
                               variant="outline" className="text-[10px] py-1 px-2"
                            >
                              <CheckCircle2 size={12} /> Publier
                            </AppButton>
                          ) : null}
                        </>
                      ) : null}
                      <AdminRowActions
                        itemLabel={row.name}
                        canEdit={canEdit && view === 'liste'}
                        hideEdit
                        hideDuplicate
                        onDelete={view === 'liste' ? () => setArchiveId(row.id) : undefined}
                      />
                    </div>
                  </td>
                </tr>
                {expanded && (
                  <tr className="border-t border-border bg-accent/20">
                    <td colSpan={9} className="px-4 py-3">
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                          Tableau de prix — {row.name}
                        </p>
                        {row.priceTiers.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Prix unique : {formatPrice(row.unitPrice)} Ar / {row.unit}
                            {canEdit && (
                              <>
                                {' · '}
                                <button
                                  type="button"
                                  className="text-primary underline"
                                  onClick={() => setTiersArticle(row)}
                                >
                                  Ajouter des paliers quantité
                                </button>
                              </>
                            )}
                          </p>
                        ) : (
                          <div className="overflow-x-auto rounded-lg border border-border bg-card">
                            <table className="w-full text-xs">
                              <thead className="bg-accent/50 text-[10px] uppercase text-muted-foreground">
                                <tr>
                                  <th className="px-2 py-1.5 text-left">Quantité</th>
                                  <th className="px-2 py-1.5 text-left">Remise / prix</th>
                                  <th className="px-2 py-1.5 text-left">Libellé</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="border-t border-border">
                                  <td className="px-2 py-1.5 font-mono">Base</td>
                                  <td className="px-2 py-1.5 font-mono text-primary">{formatPrice(row.unitPrice)} Ar/u</td>
                                  <td className="px-2 py-1.5 text-muted-foreground">Prix catalogue</td>
                                </tr>
                                {row.priceTiers.map((tier) => (
                                  <tr key={tier.id} className="border-t border-border">
                                    <td className="px-2 py-1.5 font-mono whitespace-nowrap">
                                      {formatTierQtyRange(tier.minQty, tier.maxQty)}
                                    </td>
                                    <td className="px-2 py-1.5 font-mono text-primary">
                                      {formatTierDiscount(tier, row.unitPrice)}
                                    </td>
                                    <td className="px-2 py-1.5 text-muted-foreground">{tier.label ?? '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              );
              })}
            </tbody>
          </table>
        </div>
      )}
      </>
      )}

      <DirectSaleAddonsPanel
        articleId={addonsArticle?.id ?? ''}
        articleName={addonsArticle?.name ?? ''}
        open={addonsArticle != null}
        onClose={() => setAddonsArticle(null)}
        canEdit={canEdit}
      />

      <DirectSaleTiersPanel
        articleId={tiersArticle?.id ?? ''}
        articleName={tiersArticle?.name ?? ''}
        baseUnitPrice={tiersArticle?.unitPrice ?? 0}
        open={tiersArticle != null}
        onClose={() => setTiersArticle(null)}
        canEdit={canEdit}
        onChanged={() => void load()}
      />

      <ConfirmDialog
        open={archiveId != null}
        onOpenChange={(open) => { if (!open) setArchiveId(null); }}
        title="Archiver cet article ?"
        description="L'article sera déplacé vers la corbeille et retiré du POS."
        confirmLabel="Archiver"
        variant="destructive"
        onConfirm={() => { if (archiveId) void archive(archiveId); }}
      />
    </div>
  );
}
