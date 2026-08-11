'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Rocket, Search, Upload, X, ShieldAlert, Layers } from 'lucide-react';
import { ExcelTableActions } from '@/components/admin/excel-table-actions';
import { AppButton } from '@/components/ui/app-ui';
import { formatExcelRowId } from '@/lib/backoffice/material-main-reference';
import { validatePricingArticlesExcelRows } from '@/lib/backoffice/pricing-articles-excel-format';
import dynamic from 'next/dynamic';
import { uxToast } from '@/lib/ux/feedback';
import { getApiErrorMessage } from '@/lib/api-client';
import type {
  PricingArticleDetailPayload,
  PricingArticleSummary,
} from '@/lib/server/modules/backoffice-v2/admin-backoffice-pricing.types';
import type { PricingSyncAuditReport } from '@/lib/server/modules/backoffice-v2/pricing-sync-audit.service';
import type { ArticlePricingSectionId } from '@/lib/pricing/pricing-admin-ui';
import { PRICING_SUB_SECTIONS } from '@/lib/pricing/backoffice-unified-tabs';
import { adminStatusFilterLabel, adminStatusLabel } from '@/lib/administration/admin-ui-vocab';
import { useBackofficeUrlState } from '../use-backoffice-url-state';
import { BackofficePageHeader } from '../ui/BackofficePageHeader';
import { BackofficeToolbarFilters } from '../ui/BackofficeToolbarFilters';
import { OptionsEmptyState } from '../options/OptionsEmptyState';
import { OptionsLoadingState } from '../options/OptionsLoadingState';
import { OptionsSyncStatus } from '../options/OptionsSyncStatus';
import { PricingArticlesList } from './PricingArticlesList';
import { PricingArticleSummaryTable } from './PricingArticleSummaryTable';
import { PricingDiffTable, PricingVariablesTable } from './PricingDetailTables';
import { PricingVariableMatrix } from './PricingVariableMatrix';
import { PricingBusinessRulesPanel } from './PricingBusinessRulesPanel';
import { PricingGlobalVariablesView } from './PricingGlobalVariablesView';
import { BasePrintingPriceTable } from './BasePrintingPriceTable';
import { ArticleBasePricePanel } from './ArticleBasePricePanel';
import { MaterialsPricingWorkspace } from './MaterialsPricingWorkspace';

const ArticlePricingCard = dynamic(
  () => import('@/components/admin/article-pricing-card').then((m) => m.ArticlePricingCard),
  { loading: () => <OptionsLoadingState variant="table" rows={6} /> },
);

type ViewMode = 'by-article' | 'global';
type GlobalSubView = 'articles' | 'variables-price' | 'variables-indicative' | 'materials-base' | 'base-printing';
type ArticleListFilter = 'all' | 'with-anomalies' | 'without-formula' | 'published' | 'draft';

type Props = {
  canEdit: boolean;
  initialArticleId?: string | null;
  onPublishGlobal?: () => void;
  onSyncPos?: () => void;
};

const API_ARTICLES = '/api/admin-backoffice/pricing/articles';

export function CustomPricingWorkspace({ canEdit, initialArticleId, onPublishGlobal, onSyncPos }: Props) {
  const { moduleView, articleId: urlArticleId, setModuleView, setArticleId } = useBackofficeUrlState();
  const [viewMode, setViewMode] = useState<ViewMode>(moduleView);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [familyFilter, setFamilyFilter] = useState('all');
  const [calculationFilter, setCalculationFilter] = useState('all');
  const [formulaFilter, setFormulaFilter] = useState('all');
  const [articleListFilter, setArticleListFilter] = useState<ArticleListFilter>('all');
  const [unpublishedChanges, setUnpublishedChanges] = useState(0);
  const [lastPublishedAt, setLastPublishedAt] = useState<string | null>(null);

  const [allArticles, setAllArticles] = useState<PricingArticleSummary[]>([]);
  const [articleStats, setArticleStats] = useState<{ totalArticles: number; withoutFormula: number } | null>(null);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [articlesError, setArticlesError] = useState<string | null>(null);

  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PricingArticleDetailPayload | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<ArticlePricingSectionId>('infos');
  const [publishing, setPublishing] = useState(false);
  const [bulkPublishing, setBulkPublishing] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditReport, setAuditReport] = useState<PricingSyncAuditReport | null>(null);
  const [showAudit, setShowAudit] = useState(false);

  const [globalRows, setGlobalRows] = useState<PricingArticleSummary[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalSubView, setGlobalSubView] = useState<GlobalSubView>('articles');
  const pricingExportRowsRef = useRef<Record<string, unknown>[]>([]);

  const preparePricingExport = useCallback(async () => {
    const r = await fetch('/api/admin-backoffice/pricing/articles/import-excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'prepare-export' }),
    });
    const d = await r.json();
    if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Préparation export impossible');
    pricingExportRowsRef.current = (d.data?.rows as Record<string, unknown>[]) ?? [];
  }, []);

  useEffect(() => {
    setViewMode(moduleView);
  }, [moduleView]);

  useEffect(() => {
    const resolved = urlArticleId ?? initialArticleId ?? null;
    if (resolved) setSelectedArticleId(resolved);
  }, [urlArticleId, initialArticleId]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 160);
    return () => window.clearTimeout(t);
  }, [search]);

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    setModuleView(mode);
  };

  const selectArticle = (id: string) => {
    setSelectedArticleId(id);
    setArticleId(id);
    setActiveSection('infos');
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
        setAllArticles(d.data?.articles ?? []);
        setArticleStats({
          totalArticles: d.data?.stats?.totalArticles ?? 0,
          withoutFormula: d.data?.stats?.withoutFormula ?? 0,
        });
        setSelectedArticleId((prev) => prev ?? initialArticleId ?? d.data?.articles?.[0]?.articleId ?? null);
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
      setArticlesError('Erreur réseau');
      uxToast.error('Erreur chargement articles');
    }
    setArticlesLoading(false);
  }, [initialArticleId]);

  const loadDetail = useCallback(async (articleId: string) => {
    setDetailLoading(true);
    try {
      const r = await fetch(`${API_ARTICLES}/${articleId}`, { cache: 'no-store' });
      const d = await r.json();
      if (r.ok && d.ok) setDetail(d.data);
      else setDetail(null);
    } catch {
      setDetail(null);
    }
    setDetailLoading(false);
  }, []);

  useEffect(() => { loadArticles(); }, [loadArticles]);
  useEffect(() => {
    if (viewMode === 'by-article' && selectedArticleId) loadDetail(selectedArticleId);
  }, [viewMode, selectedArticleId, loadDetail]);

  useEffect(() => {
    if (viewMode !== 'global') return;
    setGlobalLoading(true);
    setGlobalRows(allArticles);
    setGlobalLoading(false);
  }, [viewMode, allArticles]);

  const families = useMemo(
    () => [...new Set(allArticles.map((a) => a.family))].sort(),
    [allArticles],
  );

  const calculationTypes = useMemo(
    () => [...new Set(allArticles.map((a) => a.calculationType))].sort(),
    [allArticles],
  );

  const filteredArticles = useMemo(() => {
    let list = [...allArticles];
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (a) =>
          a.articleLabel.toLowerCase().includes(q) ||
          a.articleId.toLowerCase().includes(q) ||
          a.family.toLowerCase().includes(q) ||
          a.calculationType.toLowerCase().includes(q),
      );
    }
    if (familyFilter !== 'all') list = list.filter((a) => a.family === familyFilter);
    if (calculationFilter !== 'all') list = list.filter((a) => a.calculationType === calculationFilter);
    if (formulaFilter !== 'all') list = list.filter((a) => a.formulaStatus === formulaFilter);
    switch (articleListFilter) {
      case 'with-anomalies':
        list = list.filter((a) => a.anomalyCount > 0);
        break;
      case 'without-formula':
        list = list.filter((a) => a.formulaStatus === 'none');
        break;
      case 'published':
        list = list.filter((a) => a.publicationStatus === 'published');
        break;
      case 'draft':
        list = list.filter((a) => a.publicationStatus === 'draft');
        break;
      default:
        break;
    }
    return list.sort((a, b) => a.articleLabel.localeCompare(b.articleLabel, 'fr'));
  }, [allArticles, debouncedSearch, familyFilter, calculationFilter, formulaFilter, articleListFilter]);

  const priceVariables = useMemo(
    () => (detail?.variables ?? []).filter((v) => v.impactsPrice && !v.isInformational),
    [detail],
  );
  const indicativeVariables = useMemo(
    () => (detail?.variables ?? []).filter((v) => v.isInformational || !v.impactsPrice),
    [detail],
  );

  const refresh = async () => {
    try {
      await loadArticles();
      if (viewMode === 'global') {
        setGlobalRows(allArticles);
      } else if (selectedArticleId) {
        await loadDetail(selectedArticleId);
      }
      uxToast.success('Données mises à jour');
    } catch {
      uxToast.error('Échec de l\'actualisation');
    }
  };

  const publishBulkDraft = async () => {
    if (!canEdit) return;
    const draftCount = allArticles.filter((a) => a.publicationStatus === 'draft').length;
    if (draftCount === 0) {
      uxToast.info('Aucun article brouillon à publier');
      return;
    }
    setBulkPublishing(true);
    try {
      const r = await fetch('/api/admin-backoffice/pricing/publish-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'all_draft' }),
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        uxToast.success(d.data?.message ?? 'Publication groupée terminée');
        await loadArticles();
        if (selectedArticleId) await loadDetail(selectedArticleId);
        onPublishGlobal?.();
      } else uxToast.error(d.error?.message ?? 'Publication groupée échouée');
    } catch {
      uxToast.error('Erreur réseau');
    }
    setBulkPublishing(false);
  };

  const runSyncAudit = async () => {
    setAuditLoading(true);
    setShowAudit(true);
    try {
      const r = await fetch('/api/admin-backoffice/pricing/audit', { cache: 'no-store' });
      const d = await r.json();
      if (r.ok && d.ok) setAuditReport(d.data);
      else {
        setAuditReport(null);
        uxToast.error(d.error?.message ?? 'Audit indisponible');
      }
    } catch {
      setAuditReport(null);
      uxToast.error('Erreur réseau audit');
    }
    setAuditLoading(false);
  };

  const draftArticleCount = useMemo(
    () => allArticles.filter((a) => a.publicationStatus === 'draft').length,
    [allArticles],
  );

  const publishArticle = async () => {
    if (!canEdit || !selectedArticleId) return;
    setPublishing(true);
    try {
      const r = await fetch(`/api/dynamic-pricing/${selectedArticleId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' }),
      });
      const d = await r.json();
      if (r.ok) {
        uxToast.success('Prix publiés — POS synchronisé');
        await loadArticles();
        await loadDetail(selectedArticleId);
        onPublishGlobal?.();
      } else uxToast.error(getApiErrorMessage(d, 'Publication échouée'));
    } catch {
      uxToast.error('Erreur réseau');
    }
    setPublishing(false);
  };

  const subtitle = articleStats
    ? `${articleStats.totalArticles} articles POS · formules · variables · paliers · règles métier`
    : 'Articles personnalisés — calcul dynamique, pas prix fixe simple';

  return (
    <div className="ab2-options-workspace ab2-pricing-custom-workspace">
      <BackofficePageHeader
        variant="toolbar"
        subtitle={subtitle}
        actions={(
          <>
            <AppButton type="button" variant="ghost" size="sm" onClick={refresh}>
              <RefreshCw className="inline h-3.5 w-3.5 mr-1" />
              Actualiser
            </AppButton>
            <ExcelTableActions
              fileStem="prix-calculs"
              sheetName="Prix"
              canImport={canEdit}
              importMode="upsert"
              validateRows={validatePricingArticlesExcelRows}
              onBeforeExport={preparePricingExport}
              getExportRows={() => {
                if (pricingExportRowsRef.current.length) {
                  return pricingExportRowsRef.current;
                }
                const list = viewMode === 'global' ? globalRows : allArticles;
                return list.map((a, i) => ({
                  TYPE: 'PRIX',
                  ARTICLE: a.articleLabel,
                  RÉFÉRENCE: a.articleId,
                  'TYPE PRIX': a.calculationType,
                  VALEUR: a.prixBase ?? '',
                  UNITÉ: a.saleUnit,
                  FORMULE: a.formulaStatus,
                  PALIER: a.tiersSummary,
                  STATUT: a.publicationStatus,
                  ID: formatExcelRowId(i + 1),
                }));
              }}
              onImportRows={async (rows, ctx) => {
                const r = await fetch('/api/admin-backoffice/pricing/articles/import-excel', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ rows, fileName: ctx?.fileName }),
                });
                const d = await r.json();
                if (!r.ok || !d.ok) throw new Error(d.error?.message ?? d.error ?? 'Import impossible');
                await refresh();
                return d.data;
              }}
            />
            {canEdit && draftArticleCount > 0 && (
              <AppButton type="button" variant="ghost" size="sm" onClick={publishBulkDraft} disabled={bulkPublishing}>
                <Layers className="inline h-3.5 w-3.5 mr-1" />
                {bulkPublishing ? '…' : `Publier brouillons (${draftArticleCount})`}
              </AppButton>
            )}
            <AppButton type="button" variant="ghost" size="sm" onClick={runSyncAudit} disabled={auditLoading}>
              <ShieldAlert className="inline h-3.5 w-3.5 mr-1" />
              {auditLoading ? 'Audit…' : 'Audit sync'}
            </AppButton>
            {canEdit && selectedArticleId && (
              <AppButton type="button" variant="default" size="sm" onClick={publishArticle} disabled={publishing}>
                <Rocket className="inline h-3.5 w-3.5 mr-1" />
                {publishing ? '…' : 'Publier prix'}
              </AppButton>
            )}
            {canEdit && onSyncPos && (
              <AppButton type="button" variant="ghost" size="sm" onClick={onSyncPos}>
                <Upload className="inline h-3.5 w-3.5 mr-1" />
                Sync POS
              </AppButton>
            )}
          </>
        )}
      />

      <OptionsSyncStatus unpublishedChanges={unpublishedChanges} lastPublishedAt={lastPublishedAt} />

      {showAudit && (
        <div className="ab2-audit-panel mb-3 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-elevated)] p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-sm font-semibold">Audit anomalies & synchronisation</h3>
            <AppButton type="button" variant="ghost" size="sm" onClick={() => setShowAudit(false)}>Fermer</AppButton>
          </div>
          {auditLoading && <OptionsLoadingState variant="table" rows={4} />}
          {!auditLoading && auditReport && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-xs">
                <div className="rounded-lg border p-2"><span className="text-muted-foreground">Issues</span><p className="font-bold">{auditReport.summary.totalIssues}</p></div>
                <div className="rounded-lg border p-2"><span className="text-muted-foreground">Critiques</span><p className="font-bold text-[var(--accent-primary,#FF174D)]">{auditReport.summary.anomalyCounts.critical}</p></div>
                <div className="rounded-lg border p-2"><span className="text-muted-foreground">Drift POS</span><p className="font-bold">{auditReport.summary.posDriftArticles}</p></div>
                <div className="rounded-lg border p-2"><span className="text-muted-foreground">Profils brouillon</span><p className="font-bold">{auditReport.summary.draftProfiles}</p></div>
              </div>
              <div className="max-h-64 overflow-auto space-y-1">
                {auditReport.issues.slice(0, 30).map((issue) => (
                  <div key={issue.id} className="text-xs border-b border-[var(--border-soft)] py-1.5 flex gap-2">
                    <span className={`shrink-0 font-bold uppercase text-[10px] ${issue.severity === 'critical' ? 'text-[var(--accent-primary,#FF174D)]' : issue.severity === 'warning' ? 'text-[var(--accent-gold,#FACC15)]' : 'text-muted-foreground'}`}>
                      {issue.severity}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{issue.title}</p>
                      <p className="text-muted-foreground">{issue.recommendedAction}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="ab2-view-toggle mb-3">
        <button type="button" className={viewMode === 'by-article' ? 'active' : ''} onClick={() => changeViewMode('by-article')}>
          Par article
        </button>
        <button type="button" className={viewMode === 'global' ? 'active' : ''} onClick={() => changeViewMode('global')}>
          Vue globale
        </button>
      </div>

      <BackofficeToolbarFilters>
        <div className="ab2-search-wrap ab2-search-wrap--wide">
          <Search className="h-3.5 w-3.5 shrink-0" />
          <input
            type="search"
            className="ab2-input ab2-search-input"
            placeholder="Rechercher article, famille, type calcul, formule…"
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
          <select className="ab2-input ab2-filter-select" value={articleListFilter} onChange={(e) => setArticleListFilter(e.target.value as ArticleListFilter)}>
            <option value="all">Tous les articles</option>
            <option value="without-formula">Sans formule</option>
            <option value="with-anomalies">Anomalies</option>
            <option value="published">{adminStatusFilterLabel('published')}</option>
            <option value="draft">{adminStatusFilterLabel('draft')}</option>
          </select>
        )}
        <select className="ab2-input ab2-filter-select" value={familyFilter} onChange={(e) => setFamilyFilter(e.target.value)}>
          <option value="all">Toutes familles</option>
          {families.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select className="ab2-input ab2-filter-select" value={calculationFilter} onChange={(e) => setCalculationFilter(e.target.value)}>
          <option value="all">Tous types calcul</option>
          {calculationTypes.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="ab2-input ab2-filter-select" value={formulaFilter} onChange={(e) => setFormulaFilter(e.target.value)}>
          <option value="all">Toutes formules</option>
          <option value="published">Formule publiée</option>
          <option value="draft">Formule brouillon</option>
          <option value="none">Sans formule</option>
        </select>
      </BackofficeToolbarFilters>

      {viewMode === 'global' ? (
        <div className="ab2-options-global">
          <div className="ab2-pricing-section-nav mb-3">
            <button type="button" className={`ab2-filter-chip${globalSubView === 'articles' ? ' is-active' : ''}`} onClick={() => setGlobalSubView('articles')}>
              Articles & statut
            </button>
            <button type="button" className={`ab2-filter-chip${globalSubView === 'variables-price' ? ' is-active' : ''}`} onClick={() => setGlobalSubView('variables-price')}>
              Variables impact prix
            </button>
            <button type="button" className={`ab2-filter-chip${globalSubView === 'variables-indicative' ? ' is-active' : ''}`} onClick={() => setGlobalSubView('variables-indicative')}>
              Variables indicatif
            </button>
            <button type="button" className={`ab2-filter-chip${globalSubView === 'materials-base' ? ' is-active' : ''}`} onClick={() => setGlobalSubView('materials-base')}>
              Matières de base
            </button>
            <button type="button" className={`ab2-filter-chip${globalSubView === 'base-printing' ? ' is-active' : ''}`} onClick={() => setGlobalSubView('base-printing')}>
              Prix base sans finition
            </button>
          </div>
          {globalSubView === 'variables-price' && <PricingGlobalVariablesView impact="price" canEdit={canEdit} />}
          {globalSubView === 'variables-indicative' && <PricingGlobalVariablesView impact="indicative" canEdit={canEdit} />}
          {globalSubView === 'materials-base' && <MaterialsPricingWorkspace canEdit={canEdit} />}
          {globalSubView === 'base-printing' && <BasePrintingPriceTable canEdit={canEdit} />}
          {globalSubView === 'articles' && (globalLoading ? (
            <OptionsLoadingState variant="table" rows={10} />
          ) : (
            <div className="ab2-chips-table-wrap">
              <table className="ab2-tier-table ab2-pricing-global-table">
                <thead>
                  <tr>
                    <th>Article</th>
                    <th>Famille</th>
                    <th>Type calcul</th>
                    <th>Unité</th>
                    <th>Variables</th>
                    <th>Impact prix</th>
                    <th>Formule</th>
                    <th>Paliers</th>
                    <th>Anomalies</th>
                    <th>Publication</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredArticles.map((r) => (
                    <tr key={r.articleId}>
                      <td>
                        <button type="button" className="ab2-link-btn" onClick={() => { changeViewMode('by-article'); selectArticle(r.articleId); }}>
                          <div className="ab2-cell-label">{r.articleLabel}</div>
                          <div className="ab2-cell-meta">{r.articleId}</div>
                        </button>
                      </td>
                      <td>{r.family}</td>
                      <td>{r.calculationType}</td>
                      <td>{r.saleUnit}</td>
                      <td>{r.variableCount}</td>
                      <td>{r.priceImpactCount}</td>
                      <td>{r.formulaStatus === 'none' ? '—' : `v${r.formulaVersion ?? '?'}`}</td>
                      <td>{r.tiersCount || '—'}</td>
                      <td>{r.anomalyCount > 0 ? r.anomalyCount : '—'}</td>
                      <td>
                        <span className={`ab2-badge ${r.publicationStatus === 'published' ? 'ab2-badge-success' : 'ab2-badge-muted'}`}>
                          {adminStatusLabel(r.publicationStatus)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : (
        <div className="ab2-options-split ab2-pricing-split">
          <div className="ab2-options-left">
            <div className="ab2-panel-head">
              Articles ({filteredArticles.length})
            </div>
            <PricingArticlesList
              articles={filteredArticles}
              selectedId={selectedArticleId}
              onSelect={selectArticle}
              loading={articlesLoading}
              error={articlesError}
              onResetFilters={() => {
                setSearch('');
                setFamilyFilter('all');
                setCalculationFilter('all');
                setFormulaFilter('all');
                setArticleListFilter('all');
              }}
            />
          </div>

          <div className="ab2-options-center ab2-pricing-center">
            {detailLoading && <OptionsLoadingState variant="table" rows={8} />}
            {!detailLoading && detail && selectedArticleId && (
              <>
                <PricingArticleSummaryTable detail={detail} />
                <PricingVariablesTable rows={priceVariables} title="Variables impact prix" />
                <PricingVariableMatrix
                  rows={detail.variableMatrix}
                  canEdit={canEdit}
                  onSaved={() => selectedArticleId && loadDetail(selectedArticleId)}
                />
                <PricingVariablesTable rows={indicativeVariables} title="Variables sans impact prix (indicatif)" />
                <PricingBusinessRulesPanel rules={detail.businessRules} articleId={selectedArticleId} />
                <PricingDiffTable rows={detail.diffPos} />
                <ArticleBasePricePanel
                  articleId={selectedArticleId}
                  canEdit={canEdit}
                  prixBase={detail.summary.prixBase}
                  onUpdated={() => loadDetail(selectedArticleId)}
                />

                <div className="ab2-pricing-section-nav">
                  {PRICING_SUB_SECTIONS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`ab2-filter-chip${activeSection === s.id ? ' is-active' : ''}`}
                      onClick={() => setActiveSection(s.id)}
                    >
                      {s.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`ab2-filter-chip${activeSection === 'infos' ? ' is-active' : ''}`}
                    onClick={() => setActiveSection('infos')}
                  >
                    Profil
                  </button>
                  <button
                    type="button"
                    className={`ab2-filter-chip${activeSection === 'options' ? ' is-active' : ''}`}
                    onClick={() => setActiveSection('options')}
                  >
                    Options
                  </button>
                  <button
                    type="button"
                    className={`ab2-filter-chip${activeSection === 'formule' ? ' is-active' : ''}`}
                    onClick={() => setActiveSection('formule')}
                  >
                    Formule
                  </button>
                </div>

                <ArticlePricingCard
                  articleId={selectedArticleId}
                  canEdit={canEdit}
                  catalogMode
                  activeSection={activeSection}
                  onActiveSectionChange={setActiveSection}
                  hideSectionNav
                  onUpdated={() => loadDetail(selectedArticleId)}
                />
              </>
            )}
            {!detailLoading && !detail && selectedArticleId && (
              <OptionsEmptyState title="Article introuvable" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
