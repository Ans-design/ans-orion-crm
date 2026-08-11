'use client';


import { AppButton } from '@/components/ui/app-ui';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, RefreshCw } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { ExcelTableActions } from '@/components/admin/excel-table-actions';
import {
  CATALOGUE_POS_EXCEL_COLUMNS,
  catalogueArticleToExcel,
  validateCataloguePosExcelRows,
} from '@/lib/backoffice/catalogue-pos-excel-format';
import { formatExcelRowId } from '@/lib/backoffice/material-main-reference';
import type { ChipArticleSummary } from '@/lib/server/modules/backoffice-v2/admin-backoffice-chips.types';
import type { ArticleTemplate } from '@/lib/data/article-templates';
import type { AdminBackofficeOverview } from '@/lib/server/modules/backoffice-v2/admin-backoffice.types';
import {
  parseCatalogueNavMode,
  parseCatalogueStudioTab,
  type CatalogueNavMode,
  type CatalogueStudioTab,
} from '@/lib/administration/catalogue-pos-studio';
import { CatalogueArticleNavigator } from './CatalogueArticleNavigator';
import { CatalogueStudioPanel } from './CatalogueStudioPanel';
import { CatalogueActionsMenu } from './CatalogueActionsMenu';
import { CatalogueArticlesCorbeilleTable } from './CatalogueArticlesCorbeilleTable';
import { CatalogueAnomaliesPanel } from './CatalogueAnomaliesPanel';
import { AdminTableViewTabs } from '@/components/admin/AdminTableViewTabs';
import { AdminHistoriquePlaceholder } from '@/components/admin/AdminHistoriquePlaceholder';
import './catalogue-pos-studio.css';

export type CatalogueViewTab = 'catalogue' | 'corbeille' | 'historique' | 'anomalies';

const VIEW_TABS = [
  { id: 'catalogue' as const, label: 'Articles' },
  { id: 'corbeille' as const, label: 'Corbeille' },
  { id: 'historique' as const, label: 'Historique' },
  { id: 'anomalies' as const, label: 'Anomalies' },
];

type Props = { canEdit: boolean; /** Masque le chrome page (titre / onglets view) quand embarqué */ embedded?: boolean };

export function CataloguePosUnifiedWorkspace({ canEdit, embedded = false }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const listMode = parseCatalogueNavMode(searchParams.get('nav'));
  const studioTab = parseCatalogueStudioTab(searchParams.get('studio'));
  const urlArticle = searchParams.get('article');
  const rawView = searchParams.get('view');
  const urlAction = searchParams.get('action');
  const view: CatalogueViewTab =
    rawView === 'corbeille'
      ? 'corbeille'
      : rawView === 'historique'
        ? 'historique'
        : rawView === 'anomalies' || urlAction === 'detect-duplicates'
          ? 'anomalies'
          : 'catalogue';

  const [search, setSearch] = useState('');
  const [familyFilter, setFamilyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [articles, setArticles] = useState<ChipArticleSummary[]>([]);
  const [templates, setTemplates] = useState<ArticleTemplate[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(urlArticle);
  const [selectedKind, setSelectedKind] = useState<'article' | 'model'>('article');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<AdminBackofficeOverview | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [creatingFromTemplate, setCreatingFromTemplate] = useState(false);
  const excelIdsRef = useRef<Record<string, string>>({});

  const replaceParams = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === '') params.delete(k);
        else params.set(k, v);
      }
      const base = embedded
        ? '/administration/catalogue-prix-stock'
        : '/administration/catalogue-pos';
      // Conserver l’onglet parent du module fusionné
      if (embedded && !params.get('tab')) {
        params.set('tab', 'articles');
      }
      router.replace(`${base}?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, embedded],
  );

  const loadArticles = useCallback(async () => {
    setLoading(true);
    try {
      const articlesQs = includeArchived ? '?includeInactive=1' : '';
      const [articlesRes, templatesRes, overviewRes] = await Promise.all([
        fetch(`/api/admin-backoffice/options/articles${articlesQs}`, { cache: 'no-store' }),
        fetch('/api/admin-backoffice/article-templates', { cache: 'no-store' }).catch(() => null),
        fetch('/api/admin-backoffice/overview', { cache: 'no-store' }),
      ]);
      const d = await articlesRes.json();
      if (articlesRes.ok && d.ok) {
        const list: ChipArticleSummary[] = d.data?.articles ?? d.data ?? [];
        setArticles(list);
        setSelectedArticleId((prev) => {
          if (urlArticle && list.some((a) => a.articleId === urlArticle)) return urlArticle;
          if (prev && list.some((a) => a.articleId === prev)) return prev;
          if (list.length > 0) return list[0].articleId;
          return prev;
        });
        if (urlArticle || list.length > 0) setSelectedKind('article');
      }
      if (templatesRes?.ok) {
        const td = await templatesRes.json();
        if (td.ok) setTemplates(td.data ?? td.templates ?? []);
        else if (Array.isArray(td.templates)) setTemplates(td.templates);
      }
      if (overviewRes.ok) {
        const ov = await overviewRes.json();
        if (ov.ok) setOverview(ov.data);
      }
    } catch {
      uxToast.error('Erreur chargement catalogue');
    }
    setLoading(false);
  }, [urlArticle, includeArchived]);

  useEffect(() => {
    void loadArticles();
  }, [loadArticles]);

  useEffect(() => {
    if (urlArticle) {
      setSelectedArticleId(urlArticle);
      setSelectedKind('article');
    }
  }, [urlArticle]);

  const selectedArticle = useMemo(
    () => articles.find((a) => a.articleId === selectedArticleId) ?? null,
    [articles, selectedArticleId],
  );

  const selectItem = (id: string, kind: 'article' | 'model') => {
    setSelectedArticleId(id);
    setSelectedKind(kind);
    if (kind === 'article') {
      replaceParams({ article: id, nav: listMode, studio: studioTab });
    } else {
      replaceParams({ article: null, nav: 'models', studio: studioTab });
    }
  };

  const setListMode = (mode: CatalogueNavMode) => {
    replaceParams({ nav: mode === 'all' ? null : mode });
  };

  const setStudioTab = (tab: CatalogueStudioTab) => {
    replaceParams({ studio: tab === 'chips' ? null : tab });
  };

  const selectedTemplate =
    selectedKind === 'model' && selectedArticleId
      ? templates.find((t) => t.id === selectedArticleId) ?? null
      : null;

  const createArticleFromSelectedTemplate = useCallback(async () => {
    if (!canEdit) return;
    const tpl =
      selectedKind === 'model' && selectedArticleId
        ? templates.find((t) => t.id === selectedArticleId)
        : null;
    if (!tpl) {
      replaceParams({ nav: 'models', article: null });
      uxToast.info('Sélectionnez un modèle dans la liste, puis créez l’article.');
      return;
    }
    const articleId = window.prompt(
      `Identifiant article pour « ${tpl.label} »`,
      `${tpl.id.split('-')[0]}-nouveau-${Date.now().toString(36).slice(-4)}`,
    );
    if (!articleId?.trim()) return;
    setCreatingFromTemplate(true);
    try {
      const r = await fetch(`/api/backoffice/article-templates/${encodeURIComponent(tpl.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: articleId.trim(), articleLabel: tpl.label }),
      });
      const d = await r.json();
      if (!r.ok) {
        uxToast.error(d.error ?? 'Création depuis modèle impossible');
        return;
      }
      const newId = articleId.trim();
      uxToast.success(`Article ${newId} créé depuis le modèle`);
      await loadArticles();
      setSelectedKind('article');
      setSelectedArticleId(newId);
      replaceParams({ article: newId, nav: null });
    } catch {
      uxToast.error('Erreur réseau');
    } finally {
      setCreatingFromTemplate(false);
    }
  }, [canEdit, selectedKind, selectedArticleId, templates, loadArticles, replaceParams]);

  const publish = async () => {
    if (!canEdit) return;
    setPublishing(true);
    try {
      const r = await fetch('/api/admin-backoffice/publish', { method: 'POST' });
      const d = await r.json();
      if (r.ok && d.ok) {
        uxToast.success('Configuration publiée');
        void loadArticles();
      } else uxToast.error(d.error?.message ?? 'Publication échouée');
    } catch {
      uxToast.error('Erreur réseau');
    }
    setPublishing(false);
  };

  const syncPos = async () => {
    if (!canEdit) return;
    setSyncing(true);
    try {
      const r = await fetch('/api/admin-backoffice/sync-pos', { method: 'POST' });
      const d = await r.json();
      if (r.ok && d.ok) {
        uxToast.success('Catalogue synchronisé vers le POS');
        void loadArticles();
      } else uxToast.error(d.error?.message ?? 'Sync échouée');
    } catch {
      uxToast.error('Erreur réseau');
    }
    setSyncing(false);
  };

  const togglePos = async (visible: boolean) => {
    if (!canEdit || !selectedArticleId || selectedKind !== 'article') return;
    try {
      const r = await fetch(`/api/backoffice/articles/${selectedArticleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visiblePos: visible }),
      });
      const d = await r.json();
      if (r.ok) {
        uxToast.success(visible ? 'Article visible dans le POS' : 'Article masqué du POS');
        void loadArticles();
      } else uxToast.error(d.error ?? 'Mise à jour impossible');
    } catch {
      uxToast.error('Erreur réseau');
    }
  };

  const changeCategory = async (familyLabel: string) => {
    if (!canEdit || !selectedArticleId || selectedKind !== 'article') return;
    try {
      const r = await fetch('/api/admin-backoffice/catalogue-pos/import-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reassign-category',
          articleIds: [selectedArticleId],
          family: familyLabel,
        }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Changement catégorie impossible');
      uxToast.success(`Catégorie → ${d.data?.family ?? familyLabel}`);
      void loadArticles();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Changement catégorie impossible');
    }
  };

  const refresh = async () => {
    try {
      await loadArticles();
      uxToast.success('Données actualisées');
    } catch {
      uxToast.error('Actualisation impossible');
    }
  };

  const filteredExportArticles = useMemo(() => {
    let list = [...articles];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((a) =>
        [a.articleLabel, a.articleId, a.family].join(' ').toLowerCase().includes(q),
      );
    }
    if (familyFilter !== 'all') list = list.filter((a) => a.family === familyFilter);
    if (statusFilter === 'pos') list = list.filter((a) => a.visiblePos);
    return list.sort((a, b) => a.articleLabel.localeCompare(b.articleLabel, 'fr'));
  }, [articles, search, familyFilter, statusFilter]);

  const prepareCatalogueExport = useCallback(async () => {
    const r = await fetch('/api/admin-backoffice/catalogue-pos/import-excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'prepare-export' }),
    });
    const d = await r.json();
    if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Préparation export impossible');
    excelIdsRef.current = (d.data?.ids as Record<string, string>) ?? {};
    await loadArticles();
  }, [loadArticles]);

  const importCatalogueRows = useCallback(
    async (incoming: Record<string, unknown>[], ctx?: { fileName?: string }) => {
      const r = await fetch('/api/admin-backoffice/catalogue-pos/import-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: incoming, fileName: ctx?.fileName ?? 'catalogue.xlsx' }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? d.error ?? 'Import impossible');
      await loadArticles();
      return d.data;
    },
    [loadArticles],
  );

  const setView = (tab: CatalogueViewTab) => {
    replaceParams({
      view: tab === 'catalogue' ? null : tab,
      action: tab === 'anomalies' ? 'detect-duplicates' : null,
    });
  };

  const openNewOption = () => {
    setStudioTab('chips');
    uxToast.info('Ajoutez ou modifiez une option dans le tableau Options / Chips ci-dessous');
  };

  const articleIdForStudio = selectedKind === 'article' ? selectedArticleId : null;

  return (
    <div className={`orion-catalogue-workspace${embedded ? ' is-embedded' : ''}`}>
      {!embedded && (
      <header className="orion-catalogue-header">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
            ORION · Administration · Catalogue &amp; POS
          </p>
          <h1>Catalogue POS</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Structure commerciale : articles, catégories, chips — les prix viennent de{' '}
            <Link href="/administration/catalogue-prix-stock?tab=prix-contexte" className="underline underline-offset-2 hover:text-foreground">
              Catalogue, Prix &amp; Stock
            </Link>
            .
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Accès direct :{' '}
            <button
              type="button"
              className="underline underline-offset-2 hover:text-foreground"
              onClick={() => setStudioTab('chips')}
            >
              Options / Chips
            </button>
            {' · '}
            <button
              type="button"
              className="underline underline-offset-2 hover:text-foreground"
              onClick={() => setView('anomalies')}
            >
              Anomalies &amp; Doublons
            </button>
          </p>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            <AppButton type="button" variant="outline" size="sm" onClick={() => void refresh()}
              disabled={loading}
            >
              <RefreshCw className={`inline h-3.5 w-3.5 mr-1${loading ? ' animate-spin' : ''}`} />
              Actualiser
            </AppButton>
            <ExcelTableActions
              fileStem="catalogue-pos"
              sheetName="Catalogue"
              columns={CATALOGUE_POS_EXCEL_COLUMNS}
              validateRows={validateCataloguePosExcelRows}
              onBeforeExport={prepareCatalogueExport}
              getExportRows={() =>
                filteredExportArticles.map((row, i) =>
                  catalogueArticleToExcel(
                    row,
                    excelIdsRef.current[row.articleId] ?? formatExcelRowId(i + 1),
                  ) as unknown as Record<string, unknown>,
                )
              }
              canImport={canEdit}
              onImportRows={importCatalogueRows}
              importTriggerEvent="orion-catalogue-excel-import"
              exportTriggerEvent="orion-catalogue-excel-export"
            />
            <AppButton type="button" variant="default" className="inline-flex items-center gap-2 text-sm" onClick={openNewOption}
              disabled={!articleIdForStudio}
              title={!articleIdForStudio ? 'Sélectionnez un article' : undefined}>
              <Plus className="h-4 w-4" />
              Nouvelle option
            </AppButton>
            <CatalogueActionsMenu
              canEdit={canEdit}
              publishing={publishing}
              syncing={syncing}
              onPublish={publish}
              onSyncPos={syncPos}
              onCreateFromTemplate={() => void createArticleFromSelectedTemplate()}
            />
          </div>
        ) : null}
      </header>
      )}

      {!embedded ? (
      <AdminTableViewTabs
        className="mb-3"
        tabs={VIEW_TABS}
        value={view}
        onChange={setView}
        ariaLabel="Navigation catalogue"
      />
      ) : null}

      {!embedded && view === 'corbeille' ? (
        <CatalogueArticlesCorbeilleTable canEdit={canEdit} onDataChanged={loadArticles} />
      ) : !embedded && view === 'historique' ? (
        <AdminHistoriquePlaceholder entityLabel="articles catalogue" entityCode="Article" />
      ) : !embedded && view === 'anomalies' ? (
        <CatalogueAnomaliesPanel
          canEdit={canEdit}
          onMerged={() => void loadArticles()}
          onSyncPos={() => void syncPos()}
        />
      ) : (
      <div className="orion-catalogue-layout orion-catalogue-layout--two-col">
        <CatalogueArticleNavigator
          listMode={listMode}
          onListModeChange={setListMode}
          search={search}
          onSearchChange={setSearch}
          familyFilter={familyFilter}
          onFamilyFilterChange={setFamilyFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          includeArchived={includeArchived}
          onIncludeArchivedChange={setIncludeArchived}
          articles={articles}
          templates={templates}
          selectedId={selectedArticleId}
          onSelect={selectItem}
          loading={loading}
        />

        <CatalogueStudioPanel
          articleId={articleIdForStudio}
          article={selectedArticle}
          studioTab={studioTab}
          onStudioTabChange={setStudioTab}
          canEdit={canEdit}
          onArticleUpdated={loadArticles}
          onTogglePos={togglePos}
          onChangeCategory={changeCategory}
          selectedTemplate={
            selectedTemplate
              ? { id: selectedTemplate.id, label: selectedTemplate.label }
              : null
          }
          onCreateFromTemplate={() => void createArticleFromSelectedTemplate()}
          createFromTemplateLoading={creatingFromTemplate}
        />
      </div>
      )}

      {view === 'catalogue' && (overview?.unpublishedChanges ?? 0) > 0 ? (
        <p className="text-xs text-amber-400/90">
          {overview?.unpublishedChanges} modification(s) non publiée(s) — utilisez le menu Actions pour publier.
        </p>
      ) : null}
    </div>
  );
}
