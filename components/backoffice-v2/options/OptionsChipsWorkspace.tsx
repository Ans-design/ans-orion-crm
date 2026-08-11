'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Search, X } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { useBackofficeUrlState } from '../use-backoffice-url-state';
import type {
  ArticleChipsPayload,
  ChipArticleSummary,
  ChipTableRow,
} from '@/lib/server/modules/backoffice-v2/admin-backoffice-chips.types';
import {
  buildArticleSearchBlob,
  buildChipRowSearchBlob,
  matchesSearchFields,
} from '@/lib/utils/search-normalize';
import {
  ARTICLE_SORT_OPTIONS,
  sortChipArticles,
  sortChipRows,
  type ArticleSortKey,
  type ChipRowSortKey,
} from '@/lib/utils/options-chips-sort';
import { BackofficePageHeader } from '../ui/BackofficePageHeader';
import { BackofficeToolbarFilters } from '../ui/BackofficeToolbarFilters';
import { ChipsDataTable } from './ChipsDataTable';
import { OptionsArticlesList } from './OptionsArticlesList';
import { OptionsArticleHeader } from './OptionsArticleHeader';
import { OptionsBlockAccordion } from './OptionsBlockAccordion';
import { OptionsEmptyState } from './OptionsEmptyState';
import { ExcelTableActions } from '@/components/admin/excel-table-actions';
import { CHIPS_EXCEL_COLUMNS, chipRowToExcel, validateChipsExcelRows } from '@/lib/backoffice/chips-excel-format';
import { ChipsCorbeilleTable } from '@/components/administration/options/ChipsCorbeilleTable';
import { OptionsLoadingState } from './OptionsLoadingState';
import { OptionsSyncStatus } from './OptionsSyncStatus';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AdminTableViewTabs } from '@/components/admin/AdminTableViewTabs';
import { AdminHistoriquePlaceholder } from '@/components/admin/AdminHistoriquePlaceholder';
import { AppButton } from '@/components/ui/app-ui';

type ViewMode = 'global' | 'by-article';
type WorkspaceTab = 'options' | 'corbeille' | 'historique';

const WORKSPACE_TABS = [
  { id: 'options' as const, label: 'Options' },
  { id: 'corbeille' as const, label: 'Corbeille' },
  { id: 'historique' as const, label: 'Historique' },
];
type LocalFilter = 'all' | 'price' | 'indicative' | 'stock' | 'prod' | 'archived';
type ChipsColumnView = 'essential' | 'advanced';

const CHIPS_MODE_STORAGE_KEY = 'orion-chips-column-mode';

function readChipsColumnMode(): ChipsColumnView {
  if (typeof window === 'undefined') return 'essential';
  const v = localStorage.getItem(CHIPS_MODE_STORAGE_KEY);
  return v === 'advanced' ? 'advanced' : 'essential';
}
type ArticleListFilter =
  | 'all'
  | 'with-price'
  | 'with-indicative'
  | 'with-anomalies'
  | 'with-archived'
  | 'active-only'
  | 'pos-only';

type ArticleStats = {
  totalArticles: number;
  articlesWithChips: number;
  totalChips: number;
  activeChips: number;
};

type Props = {
  canEdit: boolean;
  initialArticleId?: string | null;
  /** Mode intégré dans le studio Catalogue & POS */
  embedded?: boolean;
  /** Verrouille l'article — masque navigateur et vue globale */
  lockedArticleId?: string | null;
  onDataChanged?: () => void;
};

const API_ARTICLES = '/api/admin-backoffice/options/articles';
const API_CHIPS = '/api/admin-backoffice/options/chips';

export function OptionsChipsWorkspace({
  canEdit,
  initialArticleId,
  embedded = false,
  lockedArticleId = null,
  onDataChanged,
}: Props) {
  const { moduleView, articleId: urlArticleId, setModuleView, setArticleId } = useBackofficeUrlState();
  const [viewMode, setViewMode] = useState<ViewMode>(moduleView);
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('options');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [articleFilter, setArticleFilter] = useState('all');
  const [articleListFilter, setArticleListFilter] = useState<ArticleListFilter>('all');
  const [articleSort, setArticleSort] = useState<ArticleSortKey>('name-asc');
  const [chipSort, setChipSort] = useState<ChipRowSortKey>('pos-order');
  const [blockFilter, setBlockFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [impactFilter, setImpactFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [localFilter, setLocalFilter] = useState<LocalFilter>('all');
  const [chipsColumnView, setChipsColumnView] = useState<ChipsColumnView>('essential');

  useEffect(() => {
    setChipsColumnView(readChipsColumnMode());
  }, []);

  const setChipsMode = useCallback((mode: ChipsColumnView) => {
    setChipsColumnView(mode);
    try {
      localStorage.setItem(CHIPS_MODE_STORAGE_KEY, mode);
    } catch {
      /* ignore quota */
    }
  }, []);

  const [allArticles, setAllArticles] = useState<ChipArticleSummary[]>([]);
  const [articleStats, setArticleStats] = useState<ArticleStats | null>(null);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [articlesError, setArticlesError] = useState<string | null>(null);
  const [unpublishedChanges, setUnpublishedChanges] = useState(0);
  const [lastPublishedAt, setLastPublishedAt] = useState<string | null>(null);

  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [articleChips, setArticleChips] = useState<ArticleChipsPayload | null>(null);
  const [articleChipsLoading, setArticleChipsLoading] = useState(false);

  const [globalRowsRaw, setGlobalRowsRaw] = useState<ChipTableRow[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);

  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [archivePending, setArchivePending] = useState<{
    row: ChipTableRow;
    field: keyof ChipTableRow;
    value: boolean;
  } | null>(null);

  useEffect(() => {
    setViewMode(moduleView);
  }, [moduleView]);

  useEffect(() => {
    const resolved = lockedArticleId ?? urlArticleId ?? initialArticleId ?? null;
    if (resolved) setSelectedArticleId(resolved);
  }, [urlArticleId, initialArticleId, lockedArticleId]);

  useEffect(() => {
    if (embedded && lockedArticleId) {
      setViewMode('by-article');
    }
  }, [embedded, lockedArticleId]);

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    setModuleView(mode);
  };

  const selectArticle = (id: string) => {
    setSelectedArticleId(id);
    setArticleId(id);
  };

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 160);
    return () => window.clearTimeout(t);
  }, [search]);

  const resetFilters = () => {
    setSearch('');
    setArticleFilter('all');
    setArticleListFilter('all');
    setArticleSort('name-asc');
    setBlockFilter('all');
    setStatusFilter('all');
    setImpactFilter('all');
    setShowArchived(false);
    setLocalFilter('all');
  };

  const loadArticles = useCallback(async () => {
    setArticlesLoading(true);
    setArticlesError(null);
    try {
      const qs = new URLSearchParams({ includeInactive: '1' });
      const [articlesRes, overviewRes] = await Promise.all([
        fetch(`${API_ARTICLES}?${qs}`, { cache: 'no-store' }),
        fetch('/api/admin-backoffice/overview', { cache: 'no-store' }),
      ]);
      const d = await articlesRes.json();
      if (articlesRes.ok && d.ok) {
        const list: ChipArticleSummary[] = d.data?.articles ?? d.data ?? [];
        setAllArticles(list);
        setArticleStats(d.data?.stats ?? null);
        if (list.length > 0) {
          setSelectedArticleId((prev) => prev ?? initialArticleId ?? list[0].articleId);
        }
      } else {
        setAllArticles([]);
        setArticlesError(d.error?.message ?? `Erreur API (${articlesRes.status})`);
      }
      if (overviewRes.ok) {
        const ov = await overviewRes.json();
        if (ov.ok && ov.data) {
          setUnpublishedChanges(ov.data.unpublishedChanges ?? 0);
          setLastPublishedAt(ov.data.lastPublishedAt ?? null);
        }
      }
    } catch {
      setAllArticles([]);
      setArticlesError('Erreur réseau lors du chargement des articles');
      uxToast.error('Erreur chargement articles');
    }
    setArticlesLoading(false);
  }, [initialArticleId]);

  const filteredArticles = useMemo(() => {
    let list = [...allArticles];

    if (debouncedSearch) {
      list = list.filter((a) => matchesSearchFields(
        [buildArticleSearchBlob(a), String(a.variableCount), String(a.activeCount)],
        debouncedSearch,
      ));
    }

    switch (articleListFilter) {
      case 'with-price':
        list = list.filter((a) => a.priceImpactCount > 0);
        break;
      case 'with-indicative':
        list = list.filter((a) => a.indicativeCount > 0);
        break;
      case 'with-anomalies':
        list = list.filter((a) => a.anomalyCount > 0);
        break;
      case 'with-archived':
        list = list.filter((a) => a.archivedCount > 0);
        break;
      case 'active-only':
        list = list.filter((a) => a.active);
        break;
      case 'pos-only':
        list = list.filter((a) => a.visiblePos);
        break;
      default:
        break;
    }

    return sortChipArticles(list, articleSort);
  }, [allArticles, debouncedSearch, articleListFilter, articleSort]);

  const loadArticleChips = useCallback(async (articleId: string) => {
    setArticleChipsLoading(true);
    try {
      const qs = new URLSearchParams();
      if (showArchived) qs.set('includeArchived', '1');
      const r = await fetch(`${API_ARTICLES}/${articleId}/chips?${qs}`, { cache: 'no-store' });
      const d = await r.json();
      if (r.ok && d.ok) setArticleChips(d.data);
      else setArticleChips(null);
    } catch {
      setArticleChips(null);
    }
    setArticleChipsLoading(false);
  }, [showArchived]);

  const loadGlobal = useCallback(async () => {
    setGlobalLoading(true);
    try {
      const qs = new URLSearchParams();
      if (articleFilter !== 'all') qs.set('articleId', articleFilter);
      if (blockFilter !== 'all') qs.set('block', blockFilter);
      if (statusFilter !== 'all') qs.set('status', statusFilter);
      if (impactFilter !== 'all') qs.set('impact', impactFilter);
      if (showArchived) qs.set('includeArchived', '1');
      qs.set('limit', '3000');
      const r = await fetch(`${API_CHIPS}?${qs}`, { cache: 'no-store' });
      const d = await r.json();
      if (r.ok && d.ok) setGlobalRowsRaw(d.data.rows ?? []);
      else uxToast.error(d.error?.message ?? 'Erreur chargement');
    } catch {
      uxToast.error('Erreur chargement tableau');
    }
    setGlobalLoading(false);
  }, [articleFilter, blockFilter, statusFilter, impactFilter, showArchived]);

  useEffect(() => { loadArticles(); }, [loadArticles]);

  useEffect(() => {
    if (viewMode === 'by-article' && selectedArticleId) {
      loadArticleChips(selectedArticleId);
    }
  }, [viewMode, selectedArticleId, loadArticleChips]);

  useEffect(() => {
    if (viewMode === 'global') loadGlobal();
  }, [viewMode, loadGlobal]);

  const filterLocalRows = useCallback((rows: ChipTableRow[]) => {
    let list = rows;
    if (!showArchived) list = list.filter((r) => !r.archived);
    if (debouncedSearch) {
      list = list.filter((r) => matchesSearchFields([buildChipRowSearchBlob(r)], debouncedSearch));
    }
    switch (localFilter) {
      case 'price': return list.filter((r) => r.impactsPrice);
      case 'indicative': return list.filter((r) => r.isInformational);
      case 'stock': return list.filter((r) => r.impactsStock);
      case 'prod': return list.filter((r) => r.impactsProduction);
      case 'archived': return list.filter((r) => r.archived);
      default: return list;
    }
  }, [localFilter, showArchived, debouncedSearch]);

  const articleBlocks = useMemo(() => {
    if (!articleChips) return [];
    return articleChips.blocks
      .filter((b) => blockFilter === 'all' || b.blockKey === blockFilter || b.blockLabel.includes(blockFilter))
      .map((b) => ({
        ...b,
        rows: sortChipRows(filterLocalRows(b.rows), chipSort),
      }))
      .filter((b) => b.rows.length > 0);
  }, [articleChips, filterLocalRows, blockFilter, chipSort]);

  const globalRows = useMemo(() => {
    let list = globalRowsRaw;
    if (debouncedSearch) {
      list = list.filter((r) => matchesSearchFields([buildChipRowSearchBlob(r)], debouncedSearch));
    }
    if (statusFilter === 'active') list = list.filter((r) => r.active && !r.archived);
    if (statusFilter === 'archived') list = list.filter((r) => r.archived);
    if (impactFilter === 'price') list = list.filter((r) => r.impactsPrice);
    if (impactFilter === 'indicative') list = list.filter((r) => r.isInformational);
    return sortChipRows(list, chipSort);
  }, [globalRowsRaw, debouncedSearch, statusFilter, impactFilter, chipSort]);

  const applyPatchRow = async (row: ChipTableRow, field: keyof ChipTableRow, value: boolean) => {
    if (!canEdit) return;
    const body: Record<string, boolean> = {};
    if (field === 'archived') body.active = !value;
    else if (field === 'active') body.active = value;
    else if (field === 'visiblePos') body.visiblePos = value;
    else if (field === 'impactsStock') body.impactsStock = value;
    else if (field === 'impactsProduction') body.impactsProduction = value;
    else if (field === 'isInformational') {
      body.isInformational = value;
      if (value) body.impactsPrice = false;
    } else if (field === 'impactsPrice') {
      body.impactsPrice = value;
      if (value) body.isInformational = false;
    } else return;

    const key = `${row.id}:${String(field)}`;
    setTogglingKey(key);

    const isValueRow = row.id !== row.groupId;
    const targetId =
      (field === 'active' || field === 'archived') && isValueRow ? row.id : row.groupId;

    try {
      const r = await fetch(`${API_CHIPS}/${targetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        if (field === 'isInformational' && value) {
          uxToast.info('Variable passée en indicatif : impact prix désactivé.');
        } else if (field === 'impactsPrice' && value) {
          uxToast.info('Impact prix activé : mode indicatif désactivé.');
        } else {
          uxToast.success('Variable mise à jour');
        }
        setUnpublishedChanges((n) => n + 1);
        onDataChanged?.();
        if (viewMode === 'by-article' && selectedArticleId) loadArticleChips(selectedArticleId);
        else if (viewMode === 'global') loadGlobal();
        loadArticles();
      } else uxToast.error(d.error?.message ?? 'Erreur');
    } catch {
      uxToast.error('Erreur réseau');
    }
    setTogglingKey(null);
  };

  const patchRow = (row: ChipTableRow, field: keyof ChipTableRow, value: boolean) => {
    if (!canEdit) return;
    if (field === 'archived' && value) {
      setArchivePending({ row, field, value });
      return;
    }
    void applyPatchRow(row, field, value);
  };

  const refresh = async () => {
    try {
      await loadArticles();
      if (viewMode === 'global') await loadGlobal();
      else if (selectedArticleId) await loadArticleChips(selectedArticleId);
      uxToast.success('Données mises à jour');
    } catch {
      uxToast.error('Échec de l\'actualisation');
    }
  };

  const getChipExportRows = useCallback(() => {
    const source = viewMode === 'global' ? globalRows : (articleChips?.rows ?? []);
    const seen = new Set<string>();
    const out: Record<string, unknown>[] = [];
    for (const row of source) {
      if (seen.has(row.groupId)) continue;
      seen.add(row.groupId);
      out.push(chipRowToExcel(row, row.excelRowId) as unknown as Record<string, unknown>);
    }
    return out;
  }, [viewMode, globalRows, articleChips?.rows]);

  const prepareChipExport = useCallback(async () => {
    const r = await fetch('/api/admin-backoffice/options/chips/import-excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'prepare-export' }),
    });
    const d = await r.json();
    if (!r.ok || !d.ok) {
      throw new Error(d.error?.message ?? d.error ?? 'Préparation export impossible');
    }
    if (viewMode === 'global') await loadGlobal();
    else if (selectedArticleId) await loadArticleChips(selectedArticleId);
  }, [viewMode, loadGlobal, loadArticleChips, selectedArticleId]);

  const importChipRows = useCallback(
    async (incoming: Record<string, unknown>[], ctx?: { fileName?: string }) => {
      const r = await fetch('/api/admin-backoffice/options/chips/import-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: incoming, fileName: ctx?.fileName ?? 'import-chips.xlsx' }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) {
        throw new Error(d.error?.message ?? d.error ?? 'Import impossible');
      }
      await loadArticles();
      if (viewMode === 'global') await loadGlobal();
      else if (selectedArticleId) await loadArticleChips(selectedArticleId);
      onDataChanged?.();
      return d.data;
    },
    [loadArticles, loadGlobal, loadArticleChips, viewMode, selectedArticleId, onDataChanged],
  );

  const articleOptions = useMemo(
    () => [{ id: 'all', label: 'Tous les articles' }, ...allArticles.map((a) => ({ id: a.articleId, label: a.articleLabel }))],
    [allArticles],
  );

  const subtitle = articleStats
    ? `${articleStats.totalArticles} articles POS · ${articleStats.totalChips} variables · ${articleStats.activeChips} actives`
    : 'Toutes les options POS — actives, archivées, par article.';

  return (
    <>
    <div className={`ab2-options-workspace${embedded ? ' orion-catalogue-embedded' : ''}`}>
      {!embedded && (
      <BackofficePageHeader
        variant="toolbar"
        subtitle={subtitle}
        actions={(
          <>
            <AppButton type="button" variant="ghost" size="sm" onClick={refresh}>
              <RefreshCw className="inline h-3.5 w-3.5 mr-1" />
              Actualiser
            </AppButton>
            {canEdit && (
              <AppButton type="button" variant="default" size="sm">
                <Plus className="inline h-3.5 w-3.5 mr-1" />
                Nouvelle option
              </AppButton>
            )}
          </>
        )}
      />
      )}

      {!embedded && (
      <OptionsSyncStatus unpublishedChanges={unpublishedChanges} lastPublishedAt={lastPublishedAt} />
      )}

      <AdminTableViewTabs
        className="mb-3"
        tabs={WORKSPACE_TABS}
        value={workspaceTab}
        onChange={setWorkspaceTab}
        ariaLabel="Navigation options"
      />

      {workspaceTab === 'historique' ? (
        <AdminHistoriquePlaceholder entityLabel="options / chips" entityCode="OptionGroup" />
      ) : workspaceTab === 'corbeille' ? (
        <ChipsCorbeilleTable canEdit={canEdit} onDataChanged={onDataChanged} />
      ) : (
      <>
      {!embedded && (
      <div className="ab2-view-toggle mb-3">
        <button type="button" className={viewMode === 'by-article' ? 'active' : ''} onClick={() => changeViewMode('by-article')}>
          Par article
        </button>
        <button type="button" className={viewMode === 'global' ? 'active' : ''} onClick={() => changeViewMode('global')}>
          Vue globale
        </button>
      </div>
      )}

      <BackofficeToolbarFilters>
        <div className="ab2-search-wrap ab2-search-wrap--wide">
          <Search className="h-3.5 w-3.5 shrink-0" />
          <input
            type="search"
            className="ab2-input ab2-search-input"
            placeholder="Rechercher article, bloc, libellé, source…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="ab2-search-clear" onClick={() => setSearch('')} aria-label="Effacer">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {viewMode === 'by-article' && (
          <>
            <select className="ab2-input ab2-filter-select" value={articleListFilter} onChange={(e) => setArticleListFilter(e.target.value as ArticleListFilter)}>
              <option value="all">Tous les articles</option>
              <option value="with-price">Impact prix</option>
              <option value="with-indicative">Indicatif</option>
              <option value="with-anomalies">Anomalies</option>
              <option value="with-archived">Archivées</option>
              <option value="active-only">Actifs</option>
              <option value="pos-only">POS</option>
            </select>
            <select className="ab2-input ab2-filter-select" value={articleSort} onChange={(e) => setArticleSort(e.target.value as ArticleSortKey)}>
              {ARTICLE_SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>Trier : {o.label}</option>
              ))}
            </select>
          </>
        )}
        {viewMode === 'global' && (
          <select className="ab2-input ab2-filter-select" value={articleFilter} onChange={(e) => setArticleFilter(e.target.value)}>
            {articleOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        )}
        <select className="ab2-input ab2-filter-select" value={blockFilter} onChange={(e) => setBlockFilter(e.target.value)}>
          <option value="all">Tous les blocs</option>
          <option value="Dimensions">Dimensions</option>
          <option value="Matière">Matière</option>
          <option value="Couleur">Couleur</option>
          <option value="Impression">Impression</option>
          <option value="Finition">Finition</option>
          <option value="Notes">Notes</option>
        </select>
        <select className="ab2-input ab2-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">Tous statuts</option>
          <option value="active">Actifs</option>
          <option value="archived">Archivés</option>
        </select>
        <select className="ab2-input ab2-filter-select" value={impactFilter} onChange={(e) => setImpactFilter(e.target.value)}>
          <option value="all">Tous impacts</option>
          <option value="price">Impact prix</option>
          <option value="indicative">Indicatif</option>
        </select>
        <button
          type="button"
          className={`ab2-filter-chip${showArchived ? ' is-active' : ''}`}
          onClick={() => setShowArchived(!showArchived)}
        >
          Archivées
        </button>
        <select className="ab2-input ab2-filter-select" value={chipSort} onChange={(e) => setChipSort(e.target.value as ChipRowSortKey)}>
          <option value="pos-order">Ordre métier</option>
          <option value="block">Bloc</option>
          <option value="label-asc">Libellé A-Z</option>
          <option value="label-desc">Libellé Z-A</option>
          <option value="price">Impact prix</option>
          <option value="source">Source</option>
        </select>
        <button
          type="button"
          className={`ab2-filter-chip${chipsColumnView === 'essential' ? ' is-active' : ''}`}
          onClick={() => setChipsMode('essential')}
          title="Colonnes essentielles"
        >
          Mode standard
        </button>
        <button
          type="button"
          className={`ab2-filter-chip${chipsColumnView === 'advanced' ? ' is-active' : ''}`}
          onClick={() => setChipsMode('advanced')}
          title="Colonnes avancées (impacts métier)"
        >
          Mode avancé
        </button>
        <ExcelTableActions
          fileStem="options-chips"
          sheetName="Options"
          columns={CHIPS_EXCEL_COLUMNS}
          validateRows={validateChipsExcelRows}
          onBeforeExport={prepareChipExport}
          getExportRows={getChipExportRows}
          canImport={canEdit}
          onImportRows={importChipRows}
          importTriggerEvent="orion-chips-excel-import"
          exportTriggerEvent="orion-chips-excel-export"
        />
      </BackofficeToolbarFilters>

      {viewMode === 'global' && !embedded ? (
        <div className="ab2-options-global">
          {globalLoading ? (
            <OptionsLoadingState variant="table" rows={10} />
          ) : globalRows.length === 0 ? (
            <OptionsEmptyState
              title={debouncedSearch ? `Aucun résultat pour « ${debouncedSearch} »` : 'Aucune variable pour ces filtres'}
              actions={<AppButton type="button" variant="ghost" onClick={resetFilters}>Réinitialiser</AppButton>}
            />
          ) : (
            <ChipsDataTable
              rows={globalRows}
              canEdit={canEdit}
              showArticleColumn
              viewMode={chipsColumnView}
              togglingKey={togglingKey}
              onToggle={patchRow}
              onArchive={(row) => patchRow(row, 'archived', true)}
            />
          )}
        </div>
      ) : (
        <div className="ab2-options-split">
          {!embedded && (
          <div className="ab2-options-left">
            <div className="ab2-panel-head">
              Articles ({filteredArticles.length}{filteredArticles.length !== allArticles.length ? ` / ${allArticles.length}` : ''})
            </div>
            <OptionsArticlesList
              articles={filteredArticles}
              selectedId={selectedArticleId}
              onSelect={selectArticle}
              loading={articlesLoading}
              error={articlesError}
              onResetFilters={resetFilters}
              onOpenGlobal={() => changeViewMode('global')}
            />
          </div>
          )}

          <div className="ab2-options-center">
            {articleChipsLoading && <OptionsLoadingState variant="table" rows={8} />}
            {!articleChipsLoading && articleChips && (
              <>
                {!embedded && <OptionsArticleHeader data={articleChips} />}
                <div className="ab2-local-filters">
                  {(['all', 'price', 'indicative', 'stock', 'prod', 'archived'] as LocalFilter[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={`ab2-filter-chip${localFilter === f ? ' is-active' : ''}`}
                      onClick={() => setLocalFilter(f)}
                    >
                      {f === 'all' ? 'Tous' : f === 'price' ? 'Impact prix' : f === 'indicative' ? 'Indicatif' : f === 'stock' ? 'Stock' : f === 'prod' ? 'Prod' : 'Archivées'}
                    </button>
                  ))}
                </div>
                {articleChips.counts.total === 0 ? (
                  <OptionsEmptyState
                    title="Aucune variable configurée"
                    description="Cet article n'a pas encore de variables / chips."
                  />
                ) : articleBlocks.length === 0 ? (
                  <OptionsEmptyState
                    title={debouncedSearch ? `Aucun résultat pour « ${debouncedSearch} »` : 'Aucune variable pour ces filtres'}
                    actions={<AppButton type="button" variant="ghost" onClick={resetFilters}>Réinitialiser</AppButton>}
                  />
                ) : (
                  <div className="ab2-options-variables-blocks">
                  {articleBlocks.map((block) => (
                    <OptionsBlockAccordion key={block.blockKey} title={block.blockLabel} count={block.rows.length}>
                      <ChipsDataTable
                        rows={block.rows}
                        canEdit={canEdit}
                        showArticleColumn={false}
                        viewMode={chipsColumnView}
                        togglingKey={togglingKey}
                        onToggle={patchRow}
                        onArchive={(row) => patchRow(row, 'archived', true)}
                      />
                    </OptionsBlockAccordion>
                  ))}
                  </div>
                )}
              </>
            )}
            {!articleChipsLoading && !articleChips && selectedArticleId && (
              <OptionsEmptyState title="Article introuvable" description="Cet article n'existe pas dans le catalogue POS." />
            )}
          </div>
        </div>
      )}
      </>
      )}
    </div>
    <ConfirmDialog
      open={archivePending != null}
      onOpenChange={(open) => { if (!open) setArchivePending(null); }}
      title="Confirmer l'archivage"
      description="Archiver cette variable ? Elle sera déplacée vers la corbeille et désactivée au POS."
      confirmLabel="Archiver"
      variant="destructive"
      onConfirm={async () => {
        if (!archivePending) return;
        const { row, field, value } = archivePending;
        setArchivePending(null);
        await applyPatchRow(row, field, value);
      }}
    />
    </>
  );
}
