'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Save, Search, Upload, X } from 'lucide-react';
import { ExcelTableActions } from '@/components/admin/excel-table-actions';
import { formatExcelRowId } from '@/lib/backoffice/material-main-reference';
import { validateTiersExcelRows } from '@/lib/backoffice/tiers-excel-format';
import { AppButton } from '@/components/ui/app-ui';
import { uxToast } from '@/lib/ux/feedback';
import { simulateTierLines } from '@/lib/server/modules/pricing/price-tier-simulator.service';
import type {
  ArticleTiersPayload,
  TierArticleSummary,
  TierMode,
  TierTableRow,
  TiersGlobalRow,
} from '@/lib/server/modules/backoffice-v2/admin-backoffice-tiers.types';
import { useBackofficeUrlState } from '../use-backoffice-url-state';
import { BackofficePageHeader } from '../ui/BackofficePageHeader';
import { BackofficeToolbarFilters } from '../ui/BackofficeToolbarFilters';
import { OptionsEmptyState } from '../options/OptionsEmptyState';
import { OptionsLoadingState } from '../options/OptionsLoadingState';
import { OptionsSyncStatus } from '../options/OptionsSyncStatus';
import { TierArticlesList } from './TierArticlesList';
import { ArticleTierTable, tiersToDraft, type TierDraftRow } from './ArticleTierTable';
import { TierValidationBanner } from './TierValidationBanner';
import { adminStatusFilterLabel, adminStatusLabel } from '@/lib/administration/admin-ui-vocab';

type ViewMode = 'by-article' | 'global';
type ArticleListFilter = 'all' | 'with-tiers' | 'without-tiers' | 'with-anomalies' | 'published' | 'draft';

type Props = {
  canEdit: boolean;
  initialArticleId?: string | null;
};

const API_ARTICLES = '/api/admin-backoffice/tiers/articles';
const API_GLOBAL = '/api/admin-backoffice/tiers/global';

export function TiersByArticleWorkspace({ canEdit, initialArticleId }: Props) {
  const { moduleView, articleId: urlArticleId, setModuleView, setArticleId } = useBackofficeUrlState();
  const [viewMode, setViewMode] = useState<ViewMode>(moduleView);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [articleListFilter, setArticleListFilter] = useState<ArticleListFilter>('all');
  const [unpublishedChanges, setUnpublishedChanges] = useState(0);
  const [lastPublishedAt, setLastPublishedAt] = useState<string | null>(null);

  const [allArticles, setAllArticles] = useState<TierArticleSummary[]>([]);
  const [articleStats, setArticleStats] = useState<{ totalArticles: number; withoutTiers: number } | null>(null);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [articlesError, setArticlesError] = useState<string | null>(null);

  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [articleTiers, setArticleTiers] = useState<ArticleTiersPayload | null>(null);
  const [tiersLoading, setTiersLoading] = useState(false);
  const [draftRows, setDraftRows] = useState<TierDraftRow[]>([]);
  const [tierMode, setTierMode] = useState<TierMode>('unit_price');
  const [qtyMin, setQtyMin] = useState<number | null>(null);
  const [saleUnit, setSaleUnit] = useState('pièce');
  const [selectedVariantKey, setSelectedVariantKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [globalRows, setGlobalRows] = useState<TiersGlobalRow[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);

  useEffect(() => {
    setViewMode(moduleView);
  }, [moduleView]);

  useEffect(() => {
    const resolved = urlArticleId ?? initialArticleId ?? null;
    if (resolved) setSelectedArticleId(resolved);
  }, [urlArticleId, initialArticleId]);

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    setModuleView(mode);
  };

  const selectArticle = (id: string) => {
    setSelectedVariantKey('');
    setSelectedArticleId(id);
    setArticleId(id);
  };

  const selectVariant = (variantKey: string) => {
    if (!articleTiers) return;
    setSelectedVariantKey(variantKey);
    applyVariantDraft(articleTiers, variantKey);
  };

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 160);
    return () => window.clearTimeout(t);
  }, [search]);

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
        const list: TierArticleSummary[] = d.data?.articles ?? [];
        setAllArticles(list);
        setArticleStats(d.data?.stats ?? null);
        setSelectedArticleId((prev) => prev ?? initialArticleId ?? list[0]?.articleId ?? null);
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

  const applyVariantDraft = useCallback((payload: ArticleTiersPayload, variantKey: string) => {
    const filtered = payload.tiers.filter((t) => (t.variantKey ?? '') === variantKey);
    setDraftRows(tiersToDraft(filtered));
    setTierMode(payload.tierMode);
    setQtyMin(payload.article.qtyMin);
    setSaleUnit(payload.article.saleUnit);
  }, []);

  const loadArticleTiers = useCallback(async (articleId: string) => {
    setTiersLoading(true);
    try {
      const r = await fetch(`${API_ARTICLES}/${articleId}`, { cache: 'no-store' });
      const d = await r.json();
      if (r.ok && d.ok && d.data) {
        const payload = d.data as ArticleTiersPayload;
        setArticleTiers(payload);
        const variants = payload.variants ?? [];
        const nextKey =
          variants.find((v) => v.variantKey === '')?.variantKey
          ?? variants[0]?.variantKey
          ?? '';
        setSelectedVariantKey(nextKey);
        applyVariantDraft(payload, nextKey);
      } else {
        setArticleTiers(null);
      }
    } catch {
      setArticleTiers(null);
    }
    setTiersLoading(false);
  }, [applyVariantDraft]);

  const loadGlobal = useCallback(async () => {
    setGlobalLoading(true);
    try {
      const r = await fetch(`${API_GLOBAL}?limit=500`, { cache: 'no-store' });
      const d = await r.json();
      if (r.ok && d.ok) setGlobalRows(d.data.rows ?? []);
    } catch {
      uxToast.error('Erreur vue globale');
    }
    setGlobalLoading(false);
  }, []);

  useEffect(() => { loadArticles(); }, [loadArticles]);
  useEffect(() => {
    if (viewMode === 'by-article' && selectedArticleId) loadArticleTiers(selectedArticleId);
  }, [viewMode, selectedArticleId, loadArticleTiers]);
  useEffect(() => {
    if (viewMode === 'global') loadGlobal();
  }, [viewMode, loadGlobal]);

  const filteredArticles = useMemo(() => {
    let list = [...allArticles];
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (a) =>
          a.articleLabel.toLowerCase().includes(q) ||
          a.articleId.toLowerCase().includes(q) ||
          a.family.toLowerCase().includes(q) ||
          a.saleUnit.toLowerCase().includes(q),
      );
    }
    switch (articleListFilter) {
      case 'with-tiers':
        list = list.filter((a) => a.tierCount > 0);
        break;
      case 'without-tiers':
        list = list.filter((a) => a.tierCount === 0);
        break;
      case 'with-anomalies':
        list = list.filter((a) => a.anomalyCount > 0);
        break;
      case 'published':
        list = list.filter((a) => a.publicationStatus === 'published');
        break;
      case 'draft':
        list = list.filter((a) => a.publicationStatus !== 'published');
        break;
      default:
        break;
    }
    return list.sort((a, b) => a.articleLabel.localeCompare(b.articleLabel, 'fr'));
  }, [allArticles, debouncedSearch, articleListFilter]);

  const addTier = () => {
    const last = draftRows[draftRows.length - 1];
    const nextMin = last
      ? (last.maxQty != null
        ? (Number.isInteger(last.maxQty) && last.maxQty >= 1
          ? last.maxQty + 1
          : Math.round((last.maxQty + 0.01) * 1000) / 1000)
        : last.minQty)
      : (qtyMin != null && qtyMin > 0 ? qtyMin : 1);
    setDraftRows([
      ...draftRows,
      { minQty: nextMin, maxQty: null, unitPrice: null, discountPercent: 0, active: true },
    ]);
  };

  const saveTiers = async () => {
    if (!canEdit || !selectedArticleId) return;
    setSaving(true);
    try {
      const r = await fetch(`${API_ARTICLES}/${selectedArticleId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tierMode,
          qtyMin,
          saleUnit,
          publishToPos: true,
          variantKey: selectedVariantKey,
          variantLabel:
            articleTiers?.variants.find((v) => v.variantKey === selectedVariantKey)?.variantLabel
            ?? null,
          tiers: draftRows,
        }),
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        uxToast.success('Paliers enregistrés et appliqués au POS commercial');
        setUnpublishedChanges(0);
        setLastPublishedAt(new Date().toISOString());
        const payload = d.data as ArticleTiersPayload;
        setArticleTiers(payload);
        applyVariantDraft(payload, selectedVariantKey);
        loadArticles();
      } else uxToast.error(d.error?.message ?? 'Erreur sauvegarde');
    } catch {
      uxToast.error('Erreur réseau');
    }
    setSaving(false);
  };

  const publishTiers = async () => {
    if (!canEdit || !selectedArticleId) return;
    setPublishing(true);
    try {
      const r = await fetch(`${API_ARTICLES}/${selectedArticleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' }),
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        uxToast.success('Paliers publiés — POS synchronisé');
        const payload = d.data as ArticleTiersPayload;
        setArticleTiers(payload);
        applyVariantDraft(payload, selectedVariantKey);
        loadArticles();
      } else uxToast.error(d.error?.message ?? 'Publication échouée');
    } catch {
      uxToast.error('Erreur réseau');
    }
    setPublishing(false);
  };

  const refreshTiers = async () => {
    try {
      await loadArticles();
      if (viewMode === 'global') await loadGlobal();
      else if (selectedArticleId) await loadArticleTiers(selectedArticleId);
      uxToast.success('Données mises à jour');
    } catch {
      uxToast.error('Échec de l\'actualisation');
    }
  };

  const draftAsTierRows = useMemo((): TierTableRow[] => {
    const articleId = articleTiers?.article.articleId ?? selectedArticleId ?? '';
    return draftRows.map((r, i) => ({
      id: r.id ?? `draft-${i}`,
      articleId,
      variantKey: selectedVariantKey,
      variantLabel:
        articleTiers?.variants.find((v) => v.variantKey === selectedVariantKey)?.variantLabel
        ?? null,
      minQty: r.minQty,
      maxQty: r.maxQty,
      value: r.unitPrice,
      unitPrice: r.unitPrice,
      discountPercent: r.discountPercent,
      mode: tierMode,
      active: r.active,
      source: null,
      sortOrder: i,
    }));
  }, [draftRows, articleTiers, selectedArticleId, tierMode, selectedVariantKey]);

  const liveSimulations = useMemo(() => {
    if (!articleTiers) return [];
    return simulateTierLines(
      draftAsTierRows,
      tierMode,
      articleTiers.article.prixBase,
      saleUnit,
      qtyMin,
    );
  }, [articleTiers, draftAsTierRows, tierMode, saleUnit, qtyMin]);

  const subtitle = articleStats
    ? `${articleStats.totalArticles} articles · ${articleStats.withoutTiers} sans palier`
    : 'Remises dégressives par article, unité et quantité';

  return (
    <div className="ab2-options-workspace ab2-tiers-workspace">
      <BackofficePageHeader
        variant="toolbar"
        subtitle={subtitle}
        actions={(
          <>
            <AppButton type="button" variant="ghost" size="sm" onClick={refreshTiers}>
              <RefreshCw className="inline h-3.5 w-3.5 mr-1" />
              Actualiser
            </AppButton>
            <ExcelTableActions
              fileStem="paliers-remises"
              sheetName="Paliers"
              canImport={canEdit}
              validateRows={validateTiersExcelRows}
              getExportRows={() => {
                if (viewMode === 'global') {
                  return globalRows.map((r, i) => ({
                    ARTICLE: r.articleLabel,
                    RÉFÉRENCE: r.articleId,
                    'QTÉ MIN': r.firstTierMin ?? '',
                    'QTÉ MAX': r.lastTierMax ?? '',
                    MODE: r.tierMode,
                    PALIERS: r.tierCount,
                    UNITÉ: r.saleUnit,
                    STATUT: r.publicationStatus,
                    ID: formatExcelRowId(i + 1),
                  }));
                }
                return (articleTiers?.tiers ?? []).map((t, i) => ({
                  ARTICLE: articleTiers?.article.articleLabel ?? '',
                  RÉFÉRENCE: articleTiers?.article.articleId ?? '',
                  'QTÉ MIN': t.minQty,
                  'QTÉ MAX': t.maxQty ?? '',
                  MODE: t.mode,
                  VALEUR: t.value,
                  UNITÉ: articleTiers?.article.saleUnit ?? '',
                  STATUT: t.active ? 'actif' : 'inactif',
                  ID: formatExcelRowId(i + 1),
                }));
              }}
              onImportRows={async (rows, ctx) => {
                const r = await fetch('/api/admin-backoffice/tiers/import-excel', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ rows, fileName: ctx?.fileName }),
                });
                const d = await r.json();
                if (!r.ok || !d.ok) throw new Error(d.error?.message ?? d.error ?? 'Import impossible');
                await refreshTiers();
                return d.data;
              }}
            />
            {canEdit && selectedArticleId && (
              <>
                <AppButton type="button" variant="ghost" size="sm" onClick={saveTiers} disabled={saving}>
                  <Save className="inline h-3.5 w-3.5 mr-1" />
                  {saving ? '…' : 'Enregistrer'}
                </AppButton>
                <AppButton type="button" variant="default" size="sm" onClick={publishTiers} disabled={publishing}>
                  <Upload className="inline h-3.5 w-3.5 mr-1" />
                  {publishing ? '…' : 'Publier'}
                </AppButton>
              </>
            )}
          </>
        )}
      />

      <OptionsSyncStatus unpublishedChanges={unpublishedChanges} lastPublishedAt={lastPublishedAt} />

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
            placeholder="Rechercher article, unité, famille…"
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
            <option value="with-tiers">Avec paliers</option>
            <option value="without-tiers">Sans palier</option>
            <option value="with-anomalies">Anomalies</option>
            <option value="published">{adminStatusFilterLabel('published')}</option>
            <option value="draft">{adminStatusFilterLabel('draft')}</option>
          </select>
        )}
      </BackofficeToolbarFilters>

      {viewMode === 'global' ? (
        <div className="ab2-options-global">
          {globalLoading ? (
            <OptionsLoadingState variant="table" rows={10} />
          ) : (
            <div className="ab2-chips-table-wrap">
              <table className="ab2-tier-table ab2-tier-global-table">
                <thead>
                  <tr>
                    <th>Article</th>
                    <th>Famille</th>
                    <th>Unité</th>
                    <th>Min cmd</th>
                    <th>Paliers</th>
                    <th>1er palier</th>
                    <th>Statut</th>
                    <th>Anomalies</th>
                  </tr>
                </thead>
                <tbody>
                  {globalRows.map((r) => (
                    <tr key={r.articleId}>
                      <td>
                        <div className="ab2-cell-label">{r.articleLabel}</div>
                        <div className="ab2-cell-meta">{r.articleId}</div>
                      </td>
                      <td>{r.family}</td>
                      <td>{r.saleUnit}</td>
                      <td>{r.qtyMin ?? '—'}</td>
                      <td>{r.tierCount || '—'}</td>
                      <td>{r.firstTierMin ?? '—'}</td>
                      <td>
                        <span className={`ab2-badge ${r.publicationStatus === 'published' ? 'ab2-badge-success' : 'ab2-badge-muted'}`}>
                          {r.publicationStatus === 'published'
                            ? adminStatusLabel('published')
                            : r.tierCount
                              ? adminStatusLabel('draft')
                              : 'Sans palier'}
                        </span>
                      </td>
                      <td>{r.anomalyCount > 0 ? r.anomalyCount : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="ab2-options-split">
          <div className="ab2-options-left">
            <div className="ab2-panel-head">
              Articles ({filteredArticles.length})
            </div>
            <TierArticlesList
              articles={filteredArticles}
              selectedId={selectedArticleId}
              onSelect={selectArticle}
              loading={articlesLoading}
              error={articlesError}
              onResetFilters={() => { setSearch(''); setArticleListFilter('all'); }}
            />
          </div>

          <div className="ab2-options-center ab2-tiers-center">
            {tiersLoading && <OptionsLoadingState variant="table" rows={6} />}
            {!tiersLoading && articleTiers && (
              <>
                <div className="ab2-options-article-header ab2-tier-article-header">
                  <div>
                    <h3 className="ab2-options-article-title">{articleTiers.article.articleLabel}</h3>
                    <p className="ab2-options-article-sub">
                      <code>{articleTiers.article.articleId}</code>
                      {' · '}
                      {articleTiers.article.family}
                      {' · '}
                      Unité : <strong>{saleUnit}</strong>
                      {qtyMin != null && <> · Min : <strong>{qtyMin} {saleUnit}</strong></>}
                    </p>
                  </div>
                  <div className="ab2-options-counts">
                    <span><strong>{articleTiers.counts.active}</strong> actifs</span>
                    <span className={`ab2-badge ${articleTiers.article.publicationStatus === 'published' ? 'ab2-badge-success' : 'ab2-badge-muted'}`}>
                      {articleTiers.article.publicationStatus === 'published' ? 'Actif POS' : adminStatusLabel('draft')}
                    </span>
                  </div>
                </div>

                {(articleTiers.variants?.length ?? 0) > 1 && (
                  <label className="ab2-tier-mode" style={{ display: 'block', marginBottom: 10 }}>
                    <span>Variante (format / matière / support)</span>
                    <select
                      className="ab2-input ab2-filter-select"
                      value={selectedVariantKey}
                      onChange={(e) => selectVariant(e.target.value)}
                    >
                      {articleTiers.variants.map((v) => (
                        <option key={v.variantKey || 'default'} value={v.variantKey}>
                          {v.variantLabel} ({v.tierCount} paliers)
                          {v.variantKey === '' ? ' — défaut' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <div className="ab2-tier-toolbar">
                  <label className="ab2-tier-mode">
                    <span>Mode</span>
                    <select
                      className="ab2-input ab2-filter-select"
                      value={tierMode}
                      disabled={!canEdit}
                      onChange={(e) => setTierMode(e.target.value as TierMode)}
                    >
                      <option value="unit_price">Prix unitaire par palier</option>
                      <option value="percent">Remise %</option>
                      <option value="coefficient">Coefficient</option>
                    </select>
                  </label>
                  <label className="ab2-tier-mode">
                    <span>Min commande</span>
                    <input
                      type="number"
                      className="ab2-tier-input"
                      value={qtyMin ?? ''}
                      disabled={!canEdit}
                      placeholder="1"
                      onChange={(e) => setQtyMin(e.target.value === '' ? null : Number(e.target.value))}
                    />
                  </label>
                  <label className="ab2-tier-mode">
                    <span>Unité</span>
                    <input
                      className="ab2-tier-input ab2-tier-input--wide"
                      value={saleUnit}
                      disabled={!canEdit}
                      onChange={(e) => setSaleUnit(e.target.value)}
                    />
                  </label>
                  {canEdit && (
                    <AppButton type="button" variant="default" size="sm" className="ml-auto" onClick={addTier}>
                      <Plus className="inline h-3.5 w-3.5 mr-1" />
                      Ajouter palier
                    </AppButton>
                  )}
                </div>

                <ArticleTierTable
                  rows={draftRows}
                  tierMode={tierMode}
                  saleUnit={saleUnit}
                  prixBase={
                    articleTiers.variants.find((v) => v.variantKey === selectedVariantKey)
                      ?.listPrixBase
                    ?? articleTiers.article.prixBase
                  }
                  simulations={liveSimulations}
                  canEdit={canEdit}
                  onRowsChange={setDraftRows}
                />

                <TierValidationBanner validation={articleTiers.validation} />
              </>
            )}
            {!tiersLoading && !articleTiers && selectedArticleId && (
              <OptionsEmptyState title="Article introuvable" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
