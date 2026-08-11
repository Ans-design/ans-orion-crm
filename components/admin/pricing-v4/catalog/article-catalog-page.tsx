'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { uxToast } from '@/lib/ux/feedback';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  ARTICLE_FAMILY_FILTERS,
  CATALOG_LAST_ARTICLE_KEY,
  CATALOG_VIEW_STORAGE_KEY,
  type ArticleFamilyFilterId,
  type CatalogViewMode,
} from '@/lib/pricing/pricing-admin-ui';
import type { ArticleProfileRow, CatalogCounters, EnrichedArticleRow } from './article-catalog-types';
import {
  enrichArticleRow,
  matchesFamilyFilter,
  matchesSearch,
} from './article-catalog-utils';
import { isCatalogueArticleArchived } from '@/lib/administration/catalogue-display-label';
import { ChevronLeft, ChevronRight, PackageSearch, Search, X } from 'lucide-react';
import { ArticleViewToggle } from './article-view-toggle';
import { ArticleCompactChipGrid } from './article-compact-chip-grid';
import { ArticleDenseList } from './article-dense-list';
import { ArticleDetailPanel } from './article-detail-panel';
import type { CalculationType } from '@/lib/pricing/config-to-dynamic-pricing';
import { ArticleCatalogCrudModal } from './article-catalog-crud-modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AppButton } from '@/components/ui/app-ui';
import { ADMIN_UI } from '@/lib/administration/admin-ui-vocab';

type Props = {
  canEdit: boolean;
  initialArticleId?: string | null;
  /** Incrémenté depuis le header Admin pour ouvrir le CRUD création. */
  createToken?: number;
  /** Masque Exporter / Nouvel article du toolbar (actions portées par le header). */
  hidePrimaryActions?: boolean;
};

function readStoredView(): CatalogViewMode {
  if (typeof window === 'undefined') return 'list';
  const stored = localStorage.getItem(CATALOG_VIEW_STORAGE_KEY) as CatalogViewMode | null;
  if (stored === 'chips' || stored === 'list') return stored;
  return 'list';
}

function readLastArticle(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CATALOG_LAST_ARTICLE_KEY);
}

export function ArticleCatalogPage({
  canEdit,
  initialArticleId,
  createToken = 0,
  hidePrimaryActions = false,
}: Props) {
  const searchParams = useSearchParams();
  const sheetSection = searchParams.get('sheet') ?? searchParams.get('section') ?? undefined;
  const [profiles, setProfiles] = useState<ArticleProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [familyFilter, setFamilyFilter] = useState<ArticleFamilyFilterId>('all');
  const [viewMode, setViewMode] = useState<CatalogViewMode>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'fix' | 'active'>('all');
  const [familySelect, setFamilySelect] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
  const [crudMode, setCrudMode] = useState<'create' | 'edit' | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [sheetDirty, setSheetDirty] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [pendingSelectId, setPendingSelectId] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setViewMode(readStoredView());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pR = await fetch('/api/backoffice/articles?limit=200');
      const d = await pR.json();
      if (pR.ok) setProfiles(d.items ?? d.profiles ?? []);
      else if (d.error) uxToast.error(getApiErrorMessage(d, 'Erreur'));
    } catch {
      uxToast.error('Erreur chargement catalogue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (createToken > 0 && canEdit) setCrudMode('create');
  }, [createToken, canEdit]);

  const enriched = useMemo(
    () => profiles.map(enrichArticleRow),
    [profiles],
  );

  const filtered = useMemo(() => {
    return enriched.filter((row) => {
      if (!includeArchived && isCatalogueArticleArchived(row)) return false;
      if (!matchesFamilyFilter(row, familyFilter)) return false;
      if (familySelect !== 'all' && row.family !== familySelect && row.category !== familySelect) {
        return false;
      }
      if (!matchesSearch(row, search)) return false;
      if (statusFilter === 'active' && row.status !== 'published') return false;
      if (statusFilter === 'fix') {
        const needsFix =
          row.warnings.some((w) => w.severity === 'danger')
          || !row.hasPublishedFormula
          || row.prixBase == null;
        if (!needsFix) return false;
      }
      return true;
    });
  }, [enriched, familyFilter, familySelect, search, includeArchived, statusFilter]);

  const familyOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of enriched) {
      if (row.family) set.add(row.family);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [enriched]);

  const counters: CatalogCounters = useMemo(() => {
    const active = enriched.filter(
      (r) => r.status === 'published' && r.posVisible,
    ).length;
    const inactive = enriched.filter(
      (r) => r.status !== 'published' || !r.posVisible,
    ).length;
    const withFormula = enriched.filter((r) => r.hasPublishedFormula).length;
    return {
      total: enriched.length,
      filtered: filtered.length,
      active,
      draft: inactive,
      noFormula: enriched.filter((r) => !r.hasPublishedFormula).length,
      formulas: withFormula,
    };
  }, [enriched, filtered.length]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paged = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [search, familyFilter, familySelect, statusFilter, includeArchived, pageSize]);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  useEffect(() => {
    if (loading || initialized || !enriched.length) return;
    // Deep-link URL only — ne pas ouvrir le modal automatiquement (liste lisible)
    if (initialArticleId) {
      setSelectedId(initialArticleId);
      const idx = filtered.findIndex((r) => r.articleId === initialArticleId);
      if (idx >= 0) setFocusedIndex(idx);
    } else {
      const last = readLastArticle();
      if (last) {
        const idx = filtered.findIndex((r) => r.articleId === last);
        if (idx >= 0) setFocusedIndex(idx);
      }
    }
    setInitialized(true);
  }, [loading, initialized, enriched, filtered, initialArticleId]);

  useEffect(() => {
    if (focusedIndex >= filtered.length && filtered.length > 0) {
      setFocusedIndex(filtered.length - 1);
    }
  }, [filtered.length, focusedIndex]);

  useEffect(() => {
    if (initialArticleId) {
      setSelectedId(initialArticleId);
      const idx = filtered.findIndex((r) => r.articleId === initialArticleId);
      if (idx >= 0) setFocusedIndex(idx);
    }
  }, [initialArticleId, filtered]);

  const applySelectArticle = useCallback((id: string) => {
    setSheetDirty(false);
    setSelectedId(id);
    localStorage.setItem(CATALOG_LAST_ARTICLE_KEY, id);
    const idx = filtered.findIndex((r) => r.articleId === id);
    if (idx >= 0) setFocusedIndex(idx);
  }, [filtered]);

  const selectArticle = useCallback((id: string) => {
    if (id === selectedId) {
      // Re-open modal if already selected but closed — currently selectedId means open
      return;
    }
    if (sheetDirty) {
      setPendingSelectId(id);
      setLeaveOpen(true);
      return;
    }
    applySelectArticle(id);
  }, [selectedId, sheetDirty, applySelectArticle]);

  const closeSheet = useCallback(() => {
    if (sheetDirty) {
      setPendingSelectId(null);
      setLeaveOpen(true);
    } else {
      setSelectedId(null);
    }
  }, [sheetDirty]);

  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      closeSheet();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, closeSheet]);

  const confirmLeaveArticle = useCallback(() => {
    const next = pendingSelectId;
    setLeaveOpen(false);
    setPendingSelectId(null);
    if (next) applySelectArticle(next);
    else setSelectedId(null);
  }, [pendingSelectId, applySelectArticle]);

  const changeView = useCallback((mode: CatalogViewMode) => {
    setViewMode(mode);
    localStorage.setItem(CATALOG_VIEW_STORAGE_KEY, mode);
  }, []);

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.articleId === selectedId) ?? null,
    [profiles, selectedId],
  );

  const [archiveOpen, setArchiveOpen] = useState(false);

  const archiveArticle = () => {
    if (!canEdit || !selectedId) return;
    setArchiveOpen(true);
  };

  const doArchiveArticle = async () => {
    if (!canEdit || !selectedId) return;
    setArchiving(true);
    try {
      const r = await fetch(`/api/backoffice/articles/${encodeURIComponent(selectedId)}`, {
        method: 'DELETE',
      });
      const d = await r.json();
      if (r.ok) {
        uxToast.success('Article archivé');
        setSelectedId(null);
        localStorage.removeItem(CATALOG_LAST_ARTICLE_KEY);
        load();
      } else {
        uxToast.error(getApiErrorMessage(d, 'Archivage impossible'), 'Archivage impossible');
      }
    } catch {
      uxToast.error('Erreur réseau');
    }
    setArchiving(false);
  };

  const onCrudSaved = (articleId: string) => {
    load();
    selectArticle(articleId);
  };

  const sync = async () => {
    if (!canEdit) return;
    setSyncing(true);
    try {
      const r = await fetch('/api/dynamic-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      });
      const d = await r.json();
      if (r.ok && (d.success === true || d.ok === true || typeof d.profiles === 'number')) {
        uxToast.success(
          `Profils resynchronisés depuis le catalogue — ${d.profiles ?? d.created ?? 'OK'}`,
        );
        load();
      } else {
        uxToast.error(getApiErrorMessage(d, 'Sync échouée — le POS n’est pas marqué synchronisé'));
      }
    } catch {
      uxToast.error('Erreur réseau — sync non confirmée');
    }
    setSyncing(false);
  };

  const togglePos = useCallback(async (row: EnrichedArticleRow, next: boolean) => {
    if (!canEdit) return;
    const prevStatus = row.status;
    setProfiles((list) =>
      list.map((p) =>
        p.articleId === row.articleId
          ? { ...p, status: next ? 'published' : 'draft' }
          : p,
      ),
    );
    try {
      const r = await fetch(`/api/backoffice/articles/${encodeURIComponent(row.articleId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next ? 'published' : 'draft' }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setProfiles((list) =>
          list.map((p) =>
            p.articleId === row.articleId ? { ...p, status: prevStatus } : p,
          ),
        );
        uxToast.error(getApiErrorMessage(d, 'Mise à jour POS impossible'));
        return;
      }
      uxToast.success(next ? 'Article actif au POS' : 'Article retiré du POS');
    } catch {
      setProfiles((list) =>
        list.map((p) =>
          p.articleId === row.articleId ? { ...p, status: prevStatus } : p,
        ),
      );
      uxToast.error('Erreur réseau');
    }
  }, [canEdit]);

  const toggleChecked = useCallback((id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleCheckAll = useCallback((ids: string[], checked: boolean) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!filtered.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[focusedIndex]) {
      e.preventDefault();
      selectArticle(filtered[focusedIndex].articleId);
    }
  }, [filtered, focusedIndex, selectArticle]);

  return (
    <div className={`acat-page${hidePrimaryActions ? ' acat-page--studio-prix' : ''}`} onKeyDown={onKeyDown}>
      <div className="acat-toolbar">
        <div className="acat-search-wrap">
          <Search className="acat-search-icon" aria-hidden strokeWidth={2} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Article, catégorie, référence…"
            aria-label="Rechercher dans le catalogue"
            className="acat-search-input"
          />
          {search ? (
            <button
              type="button"
              className="acat-search-clear"
              onClick={() => setSearch('')}
              aria-label="Effacer la recherche"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.25} />
            </button>
          ) : null}
        </div>

        <select
          className="acat-select"
          value={familySelect}
          aria-label="Filtrer par famille"
          onChange={(e) => setFamilySelect(e.target.value)}
        >
          <option value="all">Toutes les familles</option>
          {familyOptions.map((fam) => (
            <option key={fam} value={fam}>
              {fam.replace(/_/g, ' ')}
            </option>
          ))}
        </select>

        <div className="acat-seg" role="group" aria-label="Statut">
          {(
            [
              { id: 'all' as const, label: 'Tous' },
              { id: 'fix' as const, label: 'À corriger' },
              { id: 'active' as const, label: 'Actifs POS' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`acat-seg__btn${statusFilter === f.id ? ' is-active' : ''}`}
              aria-pressed={statusFilter === f.id}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="acat-toolbar__stats" aria-live="polite">
          <span className="acat-stat is-ok">
            <strong>{counters.active}</strong> actifs
          </span>
          <span className="acat-stat is-info">
            <strong>{counters.formulas ?? counters.total - counters.noFormula}</strong> formules
          </span>
        </div>

        {!hidePrimaryActions ? (
          <div className="acat-toolbar__aside">
            <label className="acat-include-archived">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
              />
              Archivés
            </label>
            <ArticleViewToggle mode={viewMode} onChange={changeView} />
            {canEdit ? (
              <>
                <AppButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void sync()}
                  disabled={syncing}
                  title="Exporter / synchroniser catalogue → POS"
                >
                  {syncing ? 'Export…' : 'Exporter'}
                </AppButton>
                <AppButton
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => setCrudMode('create')}
                >
                  + Nouvel article
                </AppButton>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {!hidePrimaryActions &&
      ARTICLE_FAMILY_FILTERS.filter((f) =>
        ['grand_format', 'imprimerie', 'textile', 'goodies', 'evenementiel'].includes(f.id),
      ).length ? (
        <div className="acat-family-chips" role="group" aria-label="Familles rapides">
          <button
            type="button"
            className={`acat-filter-chip${familyFilter === 'all' ? ' is-active' : ''}`}
            aria-pressed={familyFilter === 'all'}
            onClick={() => setFamilyFilter('all')}
          >
            Toutes
          </button>
          {ARTICLE_FAMILY_FILTERS.filter((f) =>
            ['grand_format', 'imprimerie', 'textile', 'goodies', 'evenementiel'].includes(f.id),
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFamilyFilter(f.id)}
              className={`acat-filter-chip${familyFilter === f.id ? ' is-active' : ''}`}
              aria-pressed={familyFilter === f.id}
            >
              {f.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="acat-selector" ref={selectorRef}>
        {loading ? (
          <div className="acat-loading">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="pta-skeleton acat-chip-skeleton" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="acat-empty">
            <span className="acat-empty-icon" aria-hidden>
              <PackageSearch className="h-7 w-7" strokeWidth={1.5} />
            </span>
            <strong>Aucun article trouvé</strong>
            <span>
              {search || familyFilter !== 'all' || statusFilter !== 'all'
                ? 'Modifiez la recherche ou les filtres.'
                : 'Aucun tarif article chargé.'}
            </span>
          </div>
        ) : viewMode === 'chips' ? (
          <ArticleCompactChipGrid
            rows={paged}
            selectedId={selectedId}
            onSelect={selectArticle}
            focusedIndex={Math.max(0, focusedIndex - (safePage - 1) * pageSize)}
            onFocusIndexChange={(i) => setFocusedIndex((safePage - 1) * pageSize + i)}
          />
        ) : (
          <ArticleDenseList
            rows={paged}
            selectedId={selectedId}
            onSelect={selectArticle}
            focusedIndex={focusedIndex}
            onFocusIndexChange={setFocusedIndex}
            canEdit={canEdit}
            indexOffset={(safePage - 1) * pageSize}
            checkedIds={checkedIds}
            onToggleChecked={toggleChecked}
            onToggleCheckAll={toggleCheckAll}
            onTogglePos={togglePos}
          />
        )}

        {!loading && filtered.length > 0 ? (
          <div className="acat-pager">
            <div className="acat-pager__left">
              <span className="acat-pager__count">
                {filtered.length} résultat{filtered.length > 1 ? 's' : ''} · page {safePage}/{pageCount}
              </span>
              {hidePrimaryActions ? (
                <ArticleViewToggle mode={viewMode} onChange={changeView} />
              ) : null}
            </div>
            <div className="acat-pager__controls">
              <select
                className="acat-select acat-select--sm"
                value={pageSize}
                aria-label="Lignes par page"
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                {[10, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {n} / page
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="acat-pager__btn"
                disabled={safePage <= 1}
                aria-label="Page précédente"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="acat-pager__btn"
                disabled={safePage >= pageCount}
                aria-label="Page suivante"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {selectedId ? (
        <div
          className="acat-detail-drawer-backdrop"
          role="presentation"
          onClick={closeSheet}
        />
      ) : null}

      <div
        className={`acat-detail-drawer${selectedId ? ' is-open' : ''}`}
        ref={detailRef}
        aria-hidden={!selectedId}
      >
        {selectedId ? (
          <div
            className="acat-detail-drawer__dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Fiche produit"
          >
            <div className="acat-detail-drawer-bar">
              <span className="acat-detail-drawer-bar__spacer" aria-hidden />
              <AppButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={closeSheet}
              >
                Fermer
              </AppButton>
            </div>
            <div className="acat-detail-drawer__body">
              <ArticleDetailPanel
                articleId={selectedId}
                canEdit={canEdit}
                onUpdated={load}
                onEditArticle={canEdit && selectedId ? () => setCrudMode('edit') : undefined}
                onArchiveArticle={canEdit && selectedId ? archiveArticle : undefined}
                archiving={archiving}
                initialSection={
                  sheetSection === 'simulation' || sheetSection === 'simulateur' || sheetSection === 'sim' || sheetSection === 'versions'
                    ? 'formule'
                    : sheetSection === 'options' || sheetSection === 'historique'
                      ? 'infos'
                      : sheetSection ?? undefined
                }
                onDirtyChange={setSheetDirty}
              />
            </div>
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archiver cet article ?"
        description={`« ${selectedProfile?.articleLabel ?? selectedId ?? ''} » ne sera plus actif au POS. Il restera restaurable (aucune suppression définitive).`}
        confirmLabel="Archiver"
        cancelLabel={ADMIN_UI.cancel}
        variant="destructive"
        onConfirm={() => {
          setArchiveOpen(false);
          void doArchiveArticle();
        }}
      />

      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={(open) => {
          setLeaveOpen(open);
          if (!open) setPendingSelectId(null);
        }}
        title={ADMIN_UI.unsavedChangesTitle}
        description={ADMIN_UI.unsavedChangesBody}
        confirmLabel={ADMIN_UI.leaveWithoutSave}
        cancelLabel={ADMIN_UI.cancel}
        variant="destructive"
        onConfirm={confirmLeaveArticle}
      />

      <ArticleCatalogCrudModal
        mode={crudMode}
        initial={crudMode === 'edit' && selectedProfile ? {
          articleId: selectedProfile.articleId,
          articleLabel: selectedProfile.articleLabel,
          family: selectedProfile.family,
          calculationType: selectedProfile.calculationType as CalculationType,
          saleUnit: selectedProfile.saleUnit ?? 'pièce',
          prixBase: selectedProfile.prixBase,
          status: selectedProfile.status,
        } : null}
        onClose={() => setCrudMode(null)}
        onSaved={onCrudSaved}
      />
    </div>
  );
}
