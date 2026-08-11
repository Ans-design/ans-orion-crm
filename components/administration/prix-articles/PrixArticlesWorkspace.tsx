'use client';

/**
 * Articles finis — produits complets vendus tels quels au POS.
 * Exemples : Flyer A5, Carte de visite, T-shirt, Goodies, Roll-up, PLV…
 * ≠ Matières : ici pas de support brut à choisir, l'article EST le produit final.
 * Design aligné Matières & tarifs : AdminCatalogueShell + AdminHeader.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { LoadingState } from '@/components/ui/loading-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AdminRowActions } from '@/components/admin/AdminRowActions';
import {
  AdminCatalogueShell,
  AdminHeader,
} from '@/components/admin/catalogue-prix-stock';
import { formatPrice } from '@/lib/data/catalogue';
import { uxToast } from '@/lib/ux/feedback';
import { ExcelTableActions } from '@/components/admin/excel-table-actions';
import {
  PRIX_ARTICLES_EXCEL_COLUMNS,
  PRIX_ARTICLES_CATALOGUE_EXPORT_COLUMNS,
  PRIX_ARTICLES_BENCHMARKS_EXPORT_COLUMNS,
  characteristicsFromArticle,
  computePrintPriceFromGain,
  deriveMarginPercent,
  marginGainFromArticle,
  prixArticleToExcelRow,
  prixArticleDisplayToCatalogueExcelRow,
  validatePrixArticlesExcelRows,
} from '@/lib/backoffice/prix-articles-excel-format';
import {
  listMadagascarCostBenchmarks,
} from '@/lib/backoffice/madagascar-article-cost-benchmarks';
import { fillEmptyPrixArticleTariffs } from '@/lib/backoffice/prix-articles-tariff-fill';
import {
  shouldShowInPrixArticles,
} from '@/lib/backoffice/material-vs-article';
import { isPosCatalogueParentCard } from '@/lib/pos/article-2026-canonical-map';
import {
  formatPrix2026AdminPriceRange,
  getPrix2026AdminPriceDisplay,
  resolvePrix2026AdminArticleId,
} from '@/lib/data/prix-2026-grids';
import {
  expandPrixArticleVariantRows,
  mergeMissingPosParents,
} from '@/lib/backoffice/prix-articles-variant-rows';
import {
  AnsArticlesChrome,
  ansAtInitials,
  ansAtToneFor,
} from '@/components/admin/catalogue-prix-stock/AnsArticlesChrome';
import { EntityDrawer } from '@/components/admin/catalogue-prix-stock/EntityDrawer';
import { InlineEditableCell } from '@/components/admin/catalogue-prix-stock/InlineEditableCell';
import '@/components/admin/catalogue-prix-stock/matieres-tarifs-page.css';
import './prix-articles.css';

type Row = {
  id: string;
  excelId: string | null;
  name: string;
  category: string;
  subCategory: string | null;
  reference?: string | null;
  description?: string | null;
  unit?: string | null;
  minQuantity?: number | null;
  maxQuantity?: number | null;
  materialKey: string | null;
  materialName: string | null;
  defaultColor: string | null;
  defaultSize: string | null;
  defaultFormat: string | null;
  defaultPrintFace: string | null;
  blankUnitPrice: number | null;
  marginPercent: number | null;
  unitPrice: number;
  visiblePOS: boolean;
  status: string;
  stockQty?: number | null;
};

type EditDraft = {
  id: string;
  name: string;
  category: string;
  materialName: string;
  blankUnitPrice: number | null;
  unitPrice: number;
  marginGain: number | null;
  stockQty: number | null;
  status: string;
  visiblePOS: boolean;
};

type Props = { canEdit: boolean };

function formatAr(v: string | number): string {
  if (v === '' || v == null) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return formatPrice(n);
}

export function PrixArticlesWorkspace({ canEdit }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [family, setFamily] = useState('all');
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [drawerSaving, setDrawerSaving] = useState(false);
  /** Stock indicateur (pas de colonne DB) — session + export Excel. */
  const [localStock, setLocalStock] = useState<Record<string, number | null>>({});
  // Excel via ExcelTableActions + CustomEvents AdminHeader

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin-backoffice/direct-sale/articles', {
        cache: 'no-store',
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Chargement impossible');
      const list = (d.data.rows ?? []) as Row[];
      // Parents POS + brouillons locaux — jamais ART-xxx (les variantes matière sont expansées côté UI)
      const parents = list.filter((x) => {
        if (!shouldShowInPrixArticles(x)) return false;
        if (x.status === 'archived') return false;
        const isArtVariant =
          /^ART-/i.test(String(x.excelId ?? ''))
          || /^ART-/i.test(String(x.id ?? ''))
          || /^\[prix→/i.test(String(x.name ?? ''));
        if (isArtVariant) return false;
        if (x.status === 'draft') return true;
        return isPosCatalogueParentCard({
          id: x.id,
          excelId: x.excelId,
          reference: x.reference,
          name: x.name,
          visiblePOS: x.visiblePOS,
          status: x.status,
        });
      });
      setRows(fillEmptyPrixArticleTariffs(mergeMissingPosParents(parents)));
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const displayRows = useMemo(() => expandPrixArticleVariantRows(rows), [rows]);

  const familyTabs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of displayRows) {
      const cat = String(r.category || 'autre').trim() || 'autre';
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    const tabs = [{ id: 'all', label: 'Tous les articles', count: displayRows.length }];
    for (const [id, count] of [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr'))) {
      tabs.push({
        id,
        label: id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        count,
      });
    }
    return tabs;
  }, [displayRows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return displayRows.filter((r) => {
      if (family !== 'all' && String(r.category || 'autre') !== family) return false;
      if (!q) return true;
      const hay = [
        r.name,
        r.materialName,
        r.category,
        r.subCategory,
        r.reference,
        r.excelId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [displayRows, family, search]);

  const pricedCount = useMemo(
    () => filteredRows.filter((r) => Number(r.unitPrice) > 0).length,
    [filteredRows],
  );
  const incompleteCount = useMemo(
    () => filteredRows.filter((r) => !(Number(r.unitPrice) > 0)).length,
    [filteredRows],
  );
  const draftCount = useMemo(
    () => rows.filter((r) => r.status === 'draft').length,
    [rows],
  );
  const qualityPct =
    filteredRows.length > 0
      ? Math.round((pricedCount / filteredRows.length) * 100)
      : 0;

  const patch = async (id: string, body: Record<string, unknown>) => {
    const r = await fetch(`/api/admin-backoffice/direct-sale/articles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Enregistrement impossible');
    return d.data as Row;
  };

  const updateRow = async (
    id: string,
    patchBody: Record<string, unknown>,
    opts?: { successMessage?: string; removeIfArchived?: boolean },
  ): Promise<boolean> => {
    try {
      const updated = await patch(id, patchBody);
      if (!updated || typeof updated !== 'object' || !('id' in updated)) {
        void load();
        if (opts?.successMessage) uxToast.success(opts.successMessage);
        return true;
      }
      const next = updated as Row;
      if (opts?.removeIfArchived && next.status === 'archived') {
        setRows((prev) => prev.filter((r) => r.id !== id));
      } else {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...next } : r)));
      }
      if (opts?.successMessage) uxToast.success(opts.successMessage);
      return true;
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
      void load();
      return false;
    }
  };

  const resolveStock = (id: string, stockQty?: number | null) =>
    Object.prototype.hasOwnProperty.call(localStock, id) ? localStock[id] : (stockQty ?? null);

  const savePricing = async (
    id: string,
    next: {
      blankUnitPrice?: number | null;
      marginGain?: number | null;
      unitPrice?: number;
    },
  ) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const blank =
      next.blankUnitPrice !== undefined ? next.blankUnitPrice : row.blankUnitPrice;
    let unit = next.unitPrice !== undefined ? next.unitPrice : row.unitPrice;
    if (next.marginGain !== undefined) {
      unit = computePrintPriceFromGain(blank, next.marginGain, unit);
    }
    const marginPercent = deriveMarginPercent(blank, unit);
    await updateRow(
      id,
      {
        blankUnitPrice: blank,
        unitPrice: unit,
        marginPercent,
      },
      { successMessage: 'Tarif enregistré' },
    );
  };

  const saveStockLocal = (id: string, qty: number | null) => {
    setLocalStock((prev) => ({ ...prev, [id]: qty }));
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, stockQty: qty } : r)),
    );
    uxToast.success(
      qty == null || !Number.isFinite(qty)
        ? 'Disponibilité : sur commande'
        : `Disponibilité : ${qty} en stock (indicateur local)`,
    );
  };

  const openEdit = (row: Row) => {
    if (row.id.startsWith('pos-catalog:')) {
      void createFicheFromCatalog(row);
      return;
    }
    const gain = marginGainFromArticle(row);
    setEditDraft({
      id: row.id,
      name: row.name,
      category: row.category,
      materialName: row.materialName ?? '',
      blankUnitPrice: row.blankUnitPrice,
      unitPrice: row.unitPrice,
      marginGain: gain,
      stockQty: resolveStock(row.id, row.stockQty),
      status: row.status,
      visiblePOS: row.visiblePOS,
    });
  };

  const createFicheFromCatalog = async (row: Row) => {
    if (!canEdit) {
      uxToast.info('Droit insuffisant pour créer une fiche.');
      return;
    }
    const catalogId = row.id.replace(/^pos-catalog:/, '');
    try {
      const r = await fetch('/api/admin-backoffice/direct-sale/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: row.name,
          category: row.category || 'petit_format',
          subCategory: row.subCategory,
          reference: catalogId,
          unitPrice: row.unitPrice > 0 ? row.unitPrice : 0,
          blankUnitPrice: row.blankUnitPrice,
          marginPercent: row.marginPercent,
          materialName: row.materialName,
          materialKey: row.materialKey,
          defaultColor: row.defaultColor,
          defaultFormat: row.defaultFormat,
          defaultSize: row.defaultSize,
          defaultPrintFace: row.defaultPrintFace,
          isCustomizable: true,
          requiresQuoteIfCustom: true,
          status: 'draft',
          visiblePOS: true,
        }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Création fiche impossible');
      const created = d.data as Row | undefined;
      uxToast.success('Fiche créée (brouillon) — renseignez le prix puis publiez');
      await load();
      if (created?.id) {
        const gain = marginGainFromArticle(created);
        setEditDraft({
          id: created.id,
          name: created.name,
          category: created.category,
          materialName: created.materialName ?? '',
          blankUnitPrice: created.blankUnitPrice,
          unitPrice: created.unitPrice,
          marginGain: gain,
          stockQty: resolveStock(created.id, created.stockQty),
          status: created.status,
          visiblePOS: created.visiblePOS,
        });
      }
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Création fiche impossible');
    }
  };

  const closeEdit = () => setEditDraft(null);

  const saveDrawer = async (andSync: boolean) => {
    if (!editDraft || !canEdit) return;
    setDrawerSaving(true);
    try {
      const blank = editDraft.blankUnitPrice;
      const unit = computePrintPriceFromGain(
        blank,
        editDraft.marginGain,
        editDraft.unitPrice,
      );
      const marginPercent = deriveMarginPercent(blank, unit);
      const ok = await updateRow(
        editDraft.id,
        {
          name: editDraft.name.trim() || 'Article',
          category: editDraft.category.trim() || 'goodies',
          materialName: editDraft.materialName.trim() || null,
          blankUnitPrice: blank,
          unitPrice: unit,
          marginPercent,
          status: editDraft.status,
          visiblePOS: editDraft.visiblePOS,
          ...(andSync
            ? {
                action: editDraft.status === 'published' ? 'sync' : 'publish',
                status: 'published',
                visiblePOS: true,
              }
            : {}),
        },
        {
          successMessage: andSync
            ? 'Enregistré et synchronisé POS'
            : 'Article enregistré',
        },
      );
      if (!ok) return;
      setLocalStock((prev) => ({ ...prev, [editDraft.id]: editDraft.stockQty }));
      setRows((prev) =>
        prev.map((r) =>
          r.id === editDraft.id ? { ...r, stockQty: editDraft.stockQty } : r,
        ),
      );
      closeEdit();
    } finally {
      setDrawerSaving(false);
    }
  };

  const getPrixExportRows = useCallback(
    () =>
      rows.map((r) =>
        prixArticleToExcelRow({
          ...r,
          stockQty: Object.prototype.hasOwnProperty.call(localStock, r.id)
            ? localStock[r.id]
            : (r.stockQty ?? null),
        }) as unknown as Record<string, unknown>,
      ),
    [rows, localStock],
  );

  /** Export multi-feuilles : aperçu catalogue (= UI) + fiches parents (ré-import) + repères coûts MG. */
  const exportPrixArticlesWorkbook = useCallback(async () => {
    const catalogueSource = filteredRows.length > 0 ? filteredRows : displayRows;
    if (!catalogueSource.length && !rows.length) {
      uxToast.error('Aucune ligne à exporter');
      return;
    }

    const catalogueExcel = catalogueSource.map((r) => {
      const stockId = r.actionId ?? (!r.isVariantLine && !r.id.startsWith('pos-catalog:') ? r.id : null);
      const stockQty = stockId
        ? (Object.prototype.hasOwnProperty.call(localStock, stockId)
            ? localStock[stockId]
            : (rows.find((p) => p.id === stockId)?.stockQty ?? r.stockQty ?? null))
        : (r.stockQty ?? null);
      return prixArticleDisplayToCatalogueExcelRow({
        ...r,
        stockQty,
      }) as unknown as Record<string, unknown>;
    });

    const parentsExcel = rows.map((r) =>
      prixArticleToExcelRow({
        ...r,
        stockQty: Object.prototype.hasOwnProperty.call(localStock, r.id)
          ? localStock[r.id]
          : (r.stockQty ?? null),
      }) as unknown as Record<string, unknown>,
    );

    const benchmarksExcel = listMadagascarCostBenchmarks().map((b) => ({
      FAMILLE: b.familyKey,
      LIBELLE: b.label,
      'COUT MIN (Ar)': b.costMinAr,
      'COUT MAX (Ar)': b.costMaxAr,
      'VENTE DES (Ar)': b.saleFromAr,
      UNITE: b.unit,
      NOTE: b.note,
    }));

    const { exportMultiSheetXlsx } = await import('@/lib/admin/excel-table');
    exportMultiSheetXlsx(
      [
        {
          name: 'Catalogue aperçu',
          columns: PRIX_ARTICLES_CATALOGUE_EXPORT_COLUMNS,
          rows: catalogueExcel,
        },
        {
          name: 'Fiches parents',
          columns: PRIX_ARTICLES_EXCEL_COLUMNS,
          rows: parentsExcel,
        },
        {
          name: 'Repères coûts MG',
          columns: PRIX_ARTICLES_BENCHMARKS_EXPORT_COLUMNS,
          rows: benchmarksExcel,
        },
      ],
      'prix-articles',
    );
    uxToast.success(
      `Export Excel : ${catalogueExcel.length} ligne(s) catalogue · ${parentsExcel.length} fiche(s)`,
    );
  }, [filteredRows, displayRows, rows, localStock]);


  const importPrixRows = useCallback(
    async (
      preview: Record<string, unknown>[],
      ctx?: { fileName?: string; file?: File },
    ) => {
      const looksLikeArt2026 =
        /catalogue.?articles|prix.?imprim/i.test(ctx?.fileName ?? '')
        || preview.some((r) =>
          /^ART-/i.test(String(r['Réf.'] ?? r.Ref ?? r.ID ?? r.id ?? '')),
        );

      if (looksLikeArt2026 && ctx?.file) {
        const fd = new FormData();
        fd.append('file', ctx.file);
        fd.append('action', 'apply');
        const r = await fetch('/api/admin-backoffice/pricing/catalogue-articles-2026', {
          method: 'POST',
          body: fd,
        });
        const d = await r.json();
        if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Import Articles 2026 impossible');
        const rep = d.data as {
          articles: { created: number; updated: number; synced: number; errors: number };
          materialsArchived: { count: number };
          canonicalPosUpdated: { count: number };
        };
        void load();
        return {
          read: preview.length,
          created: rep.articles.created,
          updated: rep.articles.updated,
          ignored: 0,
          errors: rep.articles.errors ?? 0,
        };
      }

      if (!preview.length) {
        throw new Error('Fichier Excel vide');
      }

      const r = await fetch('/api/admin-backoffice/direct-sale/articles/import-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: preview, fileName: ctx?.fileName }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Import impossible');

      const report = d.data as {
        read: number;
        created: number;
        updated: number;
        unchanged: number;
        errors: number;
        synced: number;
        stockHints?: Array<{ articleId: string; qty: number | null }>;
        issues: Array<{ line: number; reason: string }>;
      };
      if (report.stockHints?.length) {
        setLocalStock((prev) => {
          const next = { ...prev };
          for (const h of report.stockHints!) {
            next[h.articleId] = h.qty;
          }
          return next;
        });
      }
      void load();
      return {
        read: report.read,
        created: report.created,
        updated: report.updated,
        unchanged: report.unchanged,
        ignored: 0,
        errors: report.errors,
        issues: report.issues,
      };
    },
    [load],
  );

  const applyArticles2026 = async () => {
    if (
      !window.confirm(
        'Appliquer le référentiel Catalogue Articles 2026 ?\n\n· Upsert ~280 articles (prix exacts)\n· Sync POS automatique\n· Archive matières parasites (roll-up, stylo…) hors matières\n\nAucune suppression de routes.',
      )
    ) {
      return;
    }
    setImporting(true);
    try {
      const r = await fetch('/api/admin-backoffice/pricing/catalogue-articles-2026', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply', useReference: true }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Application impossible');
      const rep = d.data as {
        articles: { created: number; updated: number; synced: number };
        materialsArchived: { count: number };
        canonicalPosUpdated: { count: number; ids: string[] };
      };
      uxToast.success(
        `Réf. 2026 appliquée : ${rep.articles.updated + rep.articles.created} articles · ${rep.articles.synced} sync · ${rep.materialsArchived.count} matières archivées · POS ${rep.canonicalPosUpdated.count}`,
      );
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setImporting(false);
    }
  };

  const syncAll = async () => {
    setSyncing(true);
    try {
      const r = await fetch('/api/admin-backoffice/direct-sale/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync-all' }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Sync impossible');
      uxToast.success('Articles finis synchronisés vers le POS');
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur sync');
    } finally {
      setSyncing(false);
    }
  };

  const addRow = async () => {
    try {
      const r = await fetch('/api/admin-backoffice/direct-sale/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Nouvel article ${rows.length + 1}`,
          category: 'goodies',
          unitPrice: 0,
          blankUnitPrice: 0,
          marginPercent: null,
          isCustomizable: false,
          requiresQuoteIfCustom: false,
          status: 'draft',
          visiblePOS: true,
        }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Création impossible');
      uxToast.success('Article ajouté');
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const duplicateRow = async (row: Row) => {
    try {
      const r = await fetch('/api/admin-backoffice/direct-sale/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${row.name} (copie)`,
          category: row.category,
          subCategory: row.subCategory,
          materialName: row.materialName,
          materialKey: row.materialKey,
          defaultColor: row.defaultColor,
          defaultFormat: row.defaultFormat,
          defaultSize: row.defaultSize,
          defaultPrintFace: row.defaultPrintFace,
          blankUnitPrice: row.blankUnitPrice,
          marginPercent: row.marginPercent,
          unitPrice: row.unitPrice,
          // Pas de reference POS parent — évite collision sync ; reste visible en brouillon
          isCustomizable: false,
          requiresQuoteIfCustom: false,
          status: 'draft',
          visiblePOS: true,
        }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Duplication impossible');
      const created = d.data as Row | undefined;
      if (created?.id) {
        setRows((prev) => [{ ...created, stockQty: row.stockQty ?? null }, ...prev]);
      }
      uxToast.success('Article dupliqué (brouillon) — publiez pour sync POS');
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur duplication');
    }
  };

  const publishOrSyncRow = async (row: Row) => {
    if (row.status !== 'published') {
      await updateRow(
        row.id,
        { action: 'publish', status: 'published', visiblePOS: true },
        { successMessage: 'Publié et synchronisé vers le POS' },
      );
      return;
    }
    await updateRow(row.id, { action: 'sync' }, { successMessage: 'Resync POS effectuée' });
  };

  const activeCount = useMemo(
    () => rows.filter((r) => r.status === 'published').length,
    [rows],
  );

  if (loading) {
    return (
      <AdminCatalogueShell>
        <LoadingState message="Chargement des prix articles…" />
      </AdminCatalogueShell>
    );
  }

  return (
    <AdminCatalogueShell>
      <div className="cps-hub flex w-full max-w-none flex-col gap-3 md:gap-4">
        <AdminHeader
          title="Articles finis"
          subtitle="Produits complets → sync Commercial / Catalogue POS."
          domainLabel="Articles finis"
          syncStatus={activeCount > 0 ? 'synced' : 'pending'}
          canEdit={canEdit}
          syncing={syncing || importing}
          actionsVariant="matieres-tarifs"
          newLabel="Nouvel article"
          onNew={canEdit ? () => void addRow() : undefined}
          onImport={
            canEdit
              ? () => window.dispatchEvent(new CustomEvent('orion-prix-articles-excel-import'))
              : undefined
          }
          onExport={() =>
            window.dispatchEvent(new CustomEvent('orion-prix-articles-excel-export'))
          }
          onSync={canEdit ? () => void syncAll() : undefined}
        />
        <ExcelTableActions
          fileStem="prix-articles"
          sheetName="Prix articles"
          columns={PRIX_ARTICLES_EXCEL_COLUMNS}
          getExportRows={getPrixExportRows}
          onCustomExport={exportPrixArticlesWorkbook}
          canImport={canEdit}
          onImportRows={importPrixRows}
          importTriggerEvent="orion-prix-articles-excel-import"
          exportTriggerEvent="orion-prix-articles-excel-export"
          validateRows={validatePrixArticlesExcelRows}
          importMode="upsert"
          hiddenUi
        />

        {canEdit && (
          <div className="flex flex-wrap gap-2 px-1">
            <button
              type="button"
              className="rounded-[7px] border border-[#cc0033]/30 bg-[#cc0033]/5 px-3 py-1.5 text-xs font-medium text-[#cc0033] hover:bg-[#cc0033]/10 disabled:opacity-50"
              disabled={importing}
              onClick={() => void applyArticles2026()}
            >
              {importing ? 'Application…' : 'Appliquer Catalogue Articles 2026'}
            </button>
            <span className="text-[11px] text-muted-foreground self-center">
              Supports bruts →{' '}
              <Link className="underline text-[var(--ans-red)]" href="/administration/catalogue-prix-stock?studio=matieres">
                Matières
              </Link>
            </span>
          </div>
        )}

        <AnsArticlesChrome
          leadLabel="Catalogue actif"
          leadValue={`${activeCount} article${activeCount > 1 ? 's' : ''} publié${activeCount > 1 ? 's' : ''}`}
          metrics={[
            { value: pricedCount, label: 'Tarifs complétés', tone: 'green' },
            { value: incompleteCount, label: 'À compléter', tone: 'amber' },
            { value: draftCount, label: 'Brouillons', tone: 'coral' },
          ]}
          qualityPct={qualityPct}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Rechercher un article, une matière, un format…"
          families={familyTabs}
          family={family}
          onFamilyChange={setFamily}
          footerLeft={
            <p>
              <strong>{filteredRows.length}</strong> aperçu
              {filteredRows.length > 1 ? 's' : ''} sur{' '}
              <strong>{displayRows.length} lignes</strong>
              {' · '}
              {rows.length} parent{rows.length > 1 ? 's' : ''}
            </p>
          }
        >
          <div className="ans-at__table-wrap">
            <table className="ans-at__table">
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>Article</th>
                  <th style={{ width: '28%' }}>Configuration</th>
                  <th style={{ width: '32%' }}>
                    <span className="inline-flex w-full items-center justify-between gap-2">
                      Tarification
                      <small className="font-semibold normal-case tracking-normal text-[#a8b0bf]">
                        Vierge · Marge · Imprimé
                      </small>
                    </span>
                  </th>
                  <th style={{ width: '12%' }}>Disponibilité</th>
                  <th style={{ width: '6%' }}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="pa-empty">
                      Aucun article trouvé — essayez un autre mot-clé ou une autre famille.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const isVariant = Boolean(row.isVariantLine);
                    const isCatalogOnly = row.id.startsWith('pos-catalog:');
                    const actionTargetId =
                      row.actionId
                      ?? (isCatalogOnly || isVariant ? null : row.id);
                    const chars = characteristicsFromArticle(row);
                    const typeLabel = [row.category, row.subCategory]
                      .filter(Boolean)
                      .join(' / ');
                    const marginGain = marginGainFromArticle(row);
                    const posArticleId = resolvePrix2026AdminArticleId({
                      id: String(row.reference ?? row.excelId ?? row.id).replace(
                        /^pos-catalog:/,
                        '',
                      ),
                      reference: row.reference,
                      excelId: row.excelId,
                    });
                    const prix2026Display = getPrix2026AdminPriceDisplay(posArticleId);
                    const usesPrix2026Grid = !isVariant && prix2026Display?.kind === 'grid';
                    const parentForActions = actionTargetId
                      ? rows.find((r) => r.id === actionTargetId) ?? (row as Row)
                      : (row as Row);
                    const canActOnRow = Boolean(actionTargetId) && !isCatalogOnly;
                    const tone = ansAtToneFor(String(row.category || row.name));
                    const code =
                      row.reference
                      || row.excelId
                      || (isVariant ? row.variantKey : null)
                      || row.id.slice(0, 12);
                    const blank =
                      row.blankUnitPrice != null && Number(row.blankUnitPrice) > 0
                        ? formatPrice(row.blankUnitPrice)
                        : '—';
                    const margin =
                      !isVariant && !usesPrix2026Grid && marginGain != null
                        ? formatPrice(marginGain)
                        : '—';
                    const printed = isVariant
                      ? formatPrice(row.unitPrice)
                      : usesPrix2026Grid
                        ? formatPrix2026AdminPriceRange(
                            prix2026Display.min,
                            prix2026Display.max,
                          )
                        : row.unitPrice > 0
                          ? formatPrice(row.unitPrice)
                          : '—';
                    const editableParentId =
                      actionTargetId
                      ?? (!isCatalogOnly && !isVariant ? row.id : null);
                    /** Toute ligne liée à une fiche DB : prix / dispo éditables (y compris grilles 2026). */
                    const priceEditable = canEdit && Boolean(editableParentId);
                    const stockEditable = priceEditable;
                    const editBlank = row.blankUnitPrice ?? 0;
                    const editMargin =
                      marginGain
                      ?? (editBlank > 0 && row.unitPrice > 0
                        ? Math.max(0, Math.round(row.unitPrice - editBlank))
                        : 0);
                    const editPrinted =
                      row.unitPrice > 0
                        ? row.unitPrice
                        : usesPrix2026Grid && prix2026Display
                          ? Number(prix2026Display.min) || 0
                          : 0;
                    const stockQty = editableParentId
                      ? resolveStock(
                          editableParentId,
                          (rows.find((r) => r.id === editableParentId) ?? row).stockQty,
                        )
                      : resolveStock(row.id, row.stockQty);
                    const stockStatus =
                      stockQty == null
                        ? { cls: '', label: 'Sur commande', detail: 'Non suivi' }
                        : stockQty <= 0
                          ? { cls: 'is-low', label: 'Rupture', detail: '0 en stock' }
                          : stockQty < 10
                            ? {
                                cls: 'is-low',
                                label: 'Stock faible',
                                detail: `${stockQty} en stock`,
                              }
                            : {
                                cls: 'is-available',
                                label: 'Disponible',
                                detail: `${stockQty} en stock`,
                              };

                    const featureTags = [
                      row.materialName,
                      row.defaultPrintFace,
                      row.defaultFormat,
                      row.defaultSize,
                      !isVariant && chars ? chars : null,
                    ].filter(Boolean) as string[];

                    return (
                      <tr
                        key={row.id}
                        className="ans-at__row"
                        onClick={() => {
                          const targetId =
                            actionTargetId
                            ?? (!isCatalogOnly && !isVariant ? row.id : null);
                          if (!targetId) {
                            if (isCatalogOnly) {
                              void createFicheFromCatalog(row as Row);
                            }
                            return;
                          }
                          const parent =
                            rows.find((r) => r.id === targetId) ?? (row as Row);
                          openEdit({
                            ...parent,
                            stockQty: resolveStock(parent.id, parent.stockQty),
                          });
                        }}
                      >
                        <td>
                          <div className="ans-at__identity">
                            <span className={`ans-at__mono ${tone}`}>
                              {ansAtInitials(row.name)}
                            </span>
                            <span className="ans-at__identity-copy">
                              <strong title={row.name}>{row.name}</strong>
                              <small>{code}</small>
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="ans-at__config">
                            <div className="ans-at__config-top">
                              <span className={`ans-at__family-pill ${tone}`}>
                                {String(row.category || 'article').replace(/_/g, ' ')}
                              </span>
                              {typeLabel ? (
                                <span className="ans-at__type">{typeLabel}</span>
                              ) : null}
                            </div>
                            {row.priceSourceLabel || featureTags[0] ? (
                              <p className="m-0 truncate text-[11px] font-semibold text-[var(--ans-at-ink,#354057)]">
                                {row.priceSourceLabel
                                  || featureTags.slice(0, 2).join(' · ')
                                  || '—'}
                              </p>
                            ) : null}
                            {featureTags.length > 0 ? (
                              <div className="ans-at__features">
                                {featureTags.slice(0, 4).map((t) => (
                                  <span key={`${row.id}-${t}`}>{t}</span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <div className="ans-at__pricing">
                            <div className={!priceEditable && blank === '—' ? 'is-muted' : undefined}>
                              <span>Prix vierge</span>
                              {priceEditable ? (
                                <InlineEditableCell
                                  type="number"
                                  activateOn="click"
                                  value={editBlank}
                                  canEdit={canEdit}
                                  displayClassName="ans-at__price-edit font-mono text-[11px] font-bold"
                                  formatDisplay={(v) =>
                                    Number(v) > 0 ? formatAr(v) : '—'
                                  }
                                  onSave={async (next) => {
                                    await savePricing(editableParentId!, {
                                      blankUnitPrice: Number(next) || 0,
                                    });
                                  }}
                                />
                              ) : (
                                <strong>{blank}</strong>
                              )}
                            </div>
                            <div className={!priceEditable && margin === '—' ? 'is-muted' : undefined}>
                              <span>Marge</span>
                              {priceEditable ? (
                                <InlineEditableCell
                                  type="number"
                                  activateOn="click"
                                  value={editMargin}
                                  canEdit={canEdit}
                                  displayClassName="ans-at__price-edit font-mono text-[11px] font-bold"
                                  formatDisplay={(v) =>
                                    Number(v) > 0 ? formatAr(v) : '—'
                                  }
                                  onSave={async (next) => {
                                    await savePricing(editableParentId!, {
                                      marginGain: Number(next) || 0,
                                    });
                                  }}
                                />
                              ) : (
                                <strong>{margin}</strong>
                              )}
                            </div>
                            <div className="is-total">
                              <span>Prix imprimé</span>
                              {priceEditable ? (
                                <InlineEditableCell
                                  type="number"
                                  activateOn="click"
                                  value={editPrinted}
                                  canEdit={canEdit}
                                  displayClassName="ans-at__price-edit font-mono text-[11px] font-bold"
                                  formatDisplay={(v) =>
                                    Number(v) > 0
                                      ? formatAr(v)
                                      : usesPrix2026Grid
                                        ? printed
                                        : '—'
                                  }
                                  onSave={async (next) => {
                                    await savePricing(editableParentId!, {
                                      unitPrice: Number(next) || 0,
                                    });
                                  }}
                                />
                              ) : (
                                <strong
                                  title={
                                    usesPrix2026Grid ? prix2026Display.detail : undefined
                                  }
                                >
                                  {printed}
                                </strong>
                              )}
                            </div>
                          </div>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="ans-at__stock">
                            <span className={`ans-at__status ${stockStatus.cls}`}>
                              <i aria-hidden />
                              {stockStatus.label}
                            </span>
                            {stockEditable ? (
                              <InlineEditableCell
                                type="number"
                                activateOn="click"
                                value={stockQty ?? ''}
                                canEdit={canEdit}
                                displayClassName="text-[10px] font-bold"
                                formatDisplay={(v) => {
                                  if (v === '' || v == null || !Number.isFinite(Number(v))) {
                                    return '— · Non suivi';
                                  }
                                  return `${v} · ${stockStatus.detail}`;
                                }}
                                onSave={async (next) => {
                                  const n =
                                    next === '' || next == null
                                      ? null
                                      : Number(next);
                                  saveStockLocal(
                                    editableParentId!,
                                    n != null && Number.isFinite(n) ? n : null,
                                  );
                                }}
                              />
                            ) : (
                              <small>
                                <b>{stockQty ?? '—'}</b> · {stockStatus.detail}
                              </small>
                            )}
                          </div>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <AdminRowActions
                            itemLabel={parentForActions.name}
                            canEdit={canEdit}
                            editIcon="edit"
                            editTitle={isCatalogOnly ? 'Créer fiche' : 'Modifier'}
                            editLabel={
                              isCatalogOnly
                                ? `Créer fiche ${parentForActions.name}`
                                : `Modifier ${parentForActions.name}`
                            }
                            deleteTitle="Archiver"
                            deleteLabel={`Archiver ${parentForActions.name}`}
                            onEdit={
                              canEdit
                                ? () => {
                                    if (isCatalogOnly) {
                                      void createFicheFromCatalog(row as Row);
                                      return;
                                    }
                                    if (!canActOnRow) {
                                      uxToast.info(
                                        'Sélectionnez la ligne parent pour modifier.',
                                      );
                                      return;
                                    }
                                    openEdit({
                                      ...parentForActions,
                                      stockQty: resolveStock(
                                        parentForActions.id,
                                        parentForActions.stockQty,
                                      ),
                                    });
                                  }
                                : undefined
                            }
                            hideDuplicate={isCatalogOnly}
                            onDuplicate={
                              canEdit && canActOnRow
                                ? () => void duplicateRow(parentForActions)
                                : undefined
                            }
                            onDelete={
                              canEdit && canActOnRow
                                ? () => setArchiveId(actionTargetId!)
                                : undefined
                            }
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </AnsArticlesChrome>
      </div>

      <EntityDrawer
        open={Boolean(editDraft)}
        onClose={closeEdit}
        title={editDraft?.name ?? 'Modifier article'}
        subtitle="Article · tarification POS"
        canEdit={canEdit}
        saving={drawerSaving}
        onSave={() => void saveDrawer(false)}
        onSaveAndSync={() => void saveDrawer(true)}
        widthClass="max-w-[min(calc(100vw-2rem),560px)]"
        headerContent={
          editDraft ? (
            <div className="orion-mat-sheet-heading">
              <span className="orion-mat-sheet-icon" aria-hidden>
                {ansAtInitials(editDraft.name)}
              </span>
              <div className="min-w-0">
                <div className="orion-mat-sheet-title-row">
                  <h2 className="orion-mat-sheet-title">{editDraft.name}</h2>
                  <span
                    className={`orion-mat-sheet-badge ${
                      editDraft.status === 'published'
                        ? 'is-ok'
                        : editDraft.status === 'archived'
                          ? 'is-warn'
                          : ''
                    }`}
                  >
                    {editDraft.status === 'published'
                      ? 'Publié'
                      : editDraft.status === 'archived'
                        ? 'Archivé'
                        : 'Brouillon'}
                  </span>
                </div>
                <p className="orion-mat-sheet-subtitle">
                  Prix vierge · marge · imprimé · disponibilité
                </p>
                <div className="orion-mat-sheet-chips">
                  {editDraft.category ? (
                    <span className="orion-mat-sheet-chip">{editDraft.category}</span>
                  ) : null}
                  {editDraft.visiblePOS ? (
                    <span className="orion-mat-sheet-chip is-info">Visible POS</span>
                  ) : (
                    <span className="orion-mat-sheet-chip">Masqué POS</span>
                  )}
                  {editDraft.unitPrice > 0 ? (
                    <span className="orion-mat-sheet-chip is-info">
                      {formatAr(editDraft.unitPrice)}
                    </span>
                  ) : (
                    <span className="orion-mat-sheet-chip is-anomaly">Prix à compléter</span>
                  )}
                </div>
              </div>
            </div>
          ) : undefined
        }
      >
        {editDraft ? (
          <div className="space-y-5">
            <section className="orion-mat-sheet-section">
              <h3 className="orion-mat-sheet-section-title">Identification</h3>
              <div className="orion-mat-sheet-grid">
                <label className="orion-mat-sheet-field is-span-2">
                  <span className="orion-mat-sheet-label">Nom *</span>
                  <input
                    className="orion-mat-sheet-input"
                    value={editDraft.name}
                    disabled={!canEdit}
                    onChange={(e) =>
                      setEditDraft((d) => (d ? { ...d, name: e.target.value } : d))
                    }
                  />
                </label>
                <label className="orion-mat-sheet-field">
                  <span className="orion-mat-sheet-label">Famille</span>
                  <input
                    className="orion-mat-sheet-input"
                    value={editDraft.category}
                    disabled={!canEdit}
                    onChange={(e) =>
                      setEditDraft((d) => (d ? { ...d, category: e.target.value } : d))
                    }
                  />
                </label>
                <label className="orion-mat-sheet-field">
                  <span className="orion-mat-sheet-label">Matière</span>
                  <input
                    className="orion-mat-sheet-input"
                    value={editDraft.materialName}
                    disabled={!canEdit}
                    onChange={(e) =>
                      setEditDraft((d) =>
                        d ? { ...d, materialName: e.target.value } : d,
                      )
                    }
                  />
                </label>
              </div>
            </section>

            <section className="orion-mat-sheet-section">
              <h3 className="orion-mat-sheet-section-title">Tarification</h3>
              <div className="orion-mat-sheet-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                <label className="orion-mat-sheet-field">
                  <span className="orion-mat-sheet-label">Prix vierge (Ar)</span>
                  <input
                    type="number"
                    className="orion-mat-sheet-input is-mono"
                    value={editDraft.blankUnitPrice ?? ''}
                    disabled={!canEdit}
                    onChange={(e) => {
                      const blank =
                        e.target.value === '' ? null : Number(e.target.value);
                      setEditDraft((d) =>
                        d
                          ? {
                              ...d,
                              blankUnitPrice: blank,
                              unitPrice: computePrintPriceFromGain(
                                blank,
                                d.marginGain,
                                d.unitPrice,
                              ),
                            }
                          : d,
                      );
                    }}
                  />
                </label>
                <label className="orion-mat-sheet-field">
                  <span className="orion-mat-sheet-label">Marge gain (Ar)</span>
                  <input
                    type="number"
                    className="orion-mat-sheet-input is-mono"
                    value={editDraft.marginGain ?? ''}
                    disabled={!canEdit}
                    onChange={(e) => {
                      const gain =
                        e.target.value === '' ? null : Number(e.target.value);
                      setEditDraft((d) =>
                        d
                          ? {
                              ...d,
                              marginGain: gain,
                              unitPrice: computePrintPriceFromGain(
                                d.blankUnitPrice,
                                gain,
                                d.unitPrice,
                              ),
                            }
                          : d,
                      );
                    }}
                  />
                </label>
                <label className="orion-mat-sheet-field">
                  <span className="orion-mat-sheet-label">Prix imprimé (Ar)</span>
                  <input
                    type="number"
                    className="orion-mat-sheet-input is-mono"
                    value={editDraft.unitPrice || ''}
                    disabled={!canEdit}
                    onChange={(e) => {
                      const unit = Number(e.target.value) || 0;
                      setEditDraft((d) =>
                        d
                          ? {
                              ...d,
                              unitPrice: unit,
                              marginGain:
                                d.blankUnitPrice != null
                                  ? Math.max(0, Math.round(unit - d.blankUnitPrice))
                                  : unit,
                            }
                          : d,
                      );
                    }}
                  />
                </label>
              </div>
            </section>

            <section className="orion-mat-sheet-section">
              <h3 className="orion-mat-sheet-section-title">Disponibilité &amp; publication</h3>
              <div className="orion-mat-sheet-grid">
                <label className="orion-mat-sheet-field">
                  <span className="orion-mat-sheet-label">Stock / disponibilité</span>
                  <input
                    type="number"
                    className="orion-mat-sheet-input is-mono"
                    placeholder="Vide = sur commande"
                    value={editDraft.stockQty ?? ''}
                    disabled={!canEdit}
                    onChange={(e) =>
                      setEditDraft((d) =>
                        d
                          ? {
                              ...d,
                              stockQty:
                                e.target.value === ''
                                  ? null
                                  : Number(e.target.value),
                            }
                          : d,
                      )
                    }
                  />
                  <span className="orion-mat-sheet-hint">
                    Indicateur local — stock réel dans Stock &amp; Achats.
                  </span>
                </label>
                <label className="orion-mat-sheet-field">
                  <span className="orion-mat-sheet-label">Statut</span>
                  <select
                    className="orion-mat-sheet-input"
                    value={editDraft.status}
                    disabled={!canEdit}
                    onChange={(e) =>
                      setEditDraft((d) =>
                        d ? { ...d, status: e.target.value } : d,
                      )
                    }
                  >
                    <option value="draft">Brouillon</option>
                    <option value="published">Publié</option>
                    <option value="archived">Archivé</option>
                  </select>
                </label>
                <label className="orion-mat-sheet-field">
                  <span className="orion-mat-sheet-label">Visible POS</span>
                  <label className="mt-2 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                    <input
                      type="checkbox"
                      checked={editDraft.visiblePOS}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setEditDraft((d) =>
                          d ? { ...d, visiblePOS: e.target.checked } : d,
                        )
                      }
                    />
                    Afficher dans le catalogue POS
                  </label>
                </label>
              </div>
              {canEdit ? (
                <button
                  type="button"
                  className="mt-3 text-xs font-semibold text-[#cc0033] underline"
                  onClick={() => {
                    const row = rows.find((r) => r.id === editDraft.id);
                    if (row) void publishOrSyncRow(row);
                  }}
                >
                  {editDraft.status !== 'published'
                    ? 'Publier vers POS maintenant'
                    : 'Resync POS maintenant'}
                </button>
              ) : null}
            </section>
          </div>
        ) : null}
      </EntityDrawer>

      <ConfirmDialog
        open={Boolean(archiveId)}
        onOpenChange={(open) => {
          if (!open) setArchiveId(null);
        }}
        title="Archiver cet article ?"
        description="Il disparaîtra du POS après sync."
        confirmLabel="Archiver"
        variant="destructive"
        onConfirm={async () => {
          if (archiveId) {
            await updateRow(
              archiveId,
              { status: 'archived', visiblePOS: false, action: 'sync' },
              { successMessage: 'Article archivé et retiré du POS', removeIfArchived: true },
            );
          }
          setArchiveId(null);
        }}
      />
    </AdminCatalogueShell>
  );
}
