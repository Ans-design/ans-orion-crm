'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { ChipArticleSummary } from '@/lib/server/modules/backoffice-v2/admin-backoffice-chips.types';
import type { ArticleTemplate } from '@/lib/data/article-templates';
import {
  isCatalogueArticleArchived,
  stripArchivedDisplayPrefix,
} from '@/lib/administration/catalogue-display-label';
import type { CatalogueNavMode } from '@/lib/administration/catalogue-pos-studio';
import { OptionsLoadingState } from '@/components/backoffice-v2/options/OptionsLoadingState';
import { adminStatusLabel } from '@/lib/administration/admin-ui-vocab';

type Props = {
  listMode: CatalogueNavMode;
  onListModeChange: (mode: CatalogueNavMode) => void;
  search: string;
  onSearchChange: (v: string) => void;
  familyFilter: string;
  onFamilyFilterChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  /** Inclure produits archivés / fusionnés (défaut false). */
  includeArchived: boolean;
  onIncludeArchivedChange: (v: boolean) => void;
  articles: ChipArticleSummary[];
  templates: ArticleTemplate[];
  selectedId: string | null;
  onSelect: (id: string, kind: 'article' | 'model') => void;
  loading: boolean;
};

export function CatalogueArticleNavigator({
  listMode,
  onListModeChange,
  search,
  onSearchChange,
  familyFilter,
  onFamilyFilterChange,
  statusFilter,
  onStatusFilterChange,
  includeArchived,
  onIncludeArchivedChange,
  articles,
  templates,
  selectedId,
  onSelect,
  loading,
}: Props) {
  const families = useMemo(() => {
    const set = new Set(articles.map((a) => a.family).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [articles]);

  const filteredArticles = useMemo(() => {
    let list = [...articles];
    if (!includeArchived) {
      list = list.filter((a) => !isCatalogueArticleArchived(a));
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((a) =>
        [
          stripArchivedDisplayPrefix(a.articleLabel),
          a.articleLabel,
          a.articleId,
          a.family,
          a.category,
        ]
          .join(' ')
          .toLowerCase()
          .includes(q),
      );
    }
    if (familyFilter !== 'all') {
      list = list.filter((a) => {
        const cat = a.categoryId ?? a.category;
        const fam = a.family ?? '';
        return (
          cat === familyFilter
          || fam === familyFilter
          || fam.toLowerCase().includes(familyFilter.replace(/_/g, ' '))
        );
      });
      // Grand Format : exclure archivés / doublons fusionnés
      if (familyFilter === 'grand_format' || /grand format/i.test(familyFilter)) {
        list = list.filter(
          (a) =>
            a.status === 'published'
            && a.active !== false
            && !isCatalogueArticleArchived(a)
            && !/roll[\s-]?up|x[\s-]?banner|b[aâ]che\s+.+\d|palier|pvc\s+(opaque|translucide)/i.test(
              a.articleLabel ?? '',
            ),
        );
      }
    }
    if (statusFilter === 'draft') list = list.filter((a) => a.status === 'draft' || !a.active);
    if (statusFilter === 'published') list = list.filter((a) => a.status === 'published');
    if (statusFilter === 'pos') list = list.filter((a) => a.visiblePos);
    if (statusFilter === 'anomalies') list = list.filter((a) => a.anomalyCount > 0);
    if (statusFilter === 'incoherent') list = list.filter((a) => a.categoryNeedsReview);
    if (statusFilter === 'review') list = list.filter((a) => a.categoryNeedsReview);
    return list.sort((a, b) =>
      stripArchivedDisplayPrefix(a.articleLabel).localeCompare(
        stripArchivedDisplayPrefix(b.articleLabel),
        'fr',
      ),
    );
  }, [articles, search, familyFilter, statusFilter, includeArchived]);

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) =>
      [t.label, t.id, t.family, t.description].join(' ').toLowerCase().includes(q),
    );
  }, [templates, search]);

  const showArticles = listMode === 'all' || listMode === 'articles';
  const showModels = listMode === 'all' || listMode === 'models';

  return (
    <aside className="orion-catalogue-nav" aria-label="Articles et modèles">
      <input
        type="search"
        className="orion-catalogue-nav-search"
        placeholder="Article, référence, modèle…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />

      <div className="orion-catalogue-nav-filters">
        <select value={listMode} onChange={(e) => onListModeChange(e.target.value as CatalogueNavMode)} aria-label="Type">
          <option value="all">Articles &amp; modèles</option>
          <option value="articles">Articles seulement</option>
          <option value="models">Modèles seulement</option>
        </select>
        {showArticles ? (
          <>
            <select value={familyFilter} onChange={(e) => onFamilyFilterChange(e.target.value)} aria-label="Famille">
              <option value="all">Toutes familles</option>
              {families.filter((f) => f !== 'all').map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => onStatusFilterChange(e.target.value)} aria-label="Statut">
              <option value="all">Tous statuts</option>
              <option value="published">{adminStatusLabel('published')}</option>
              <option value="draft">{adminStatusLabel('draft')}</option>
              <option value="pos">Visible POS</option>
              <option value="anomalies">Anomalies</option>
              <option value="incoherent">Catégorie incohérente</option>
              <option value="review">À vérifier</option>
            </select>
            <label className="orion-catalogue-nav-archived flex items-center gap-1.5 text-[11px] text-muted-foreground whitespace-nowrap">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => onIncludeArchivedChange(e.target.checked)}
              />
              Inclure les archivés
            </label>
          </>
        ) : null}
      </div>

      <div className="orion-catalogue-nav-list">
        {loading ? (
          <OptionsLoadingState variant="list" rows={8} />
        ) : (
          <>
            {showArticles && filteredArticles.length === 0 && listMode === 'articles' ? (
              <p className="text-xs text-muted-foreground p-2">Aucun article pour ces filtres.</p>
            ) : null}
            {showArticles
              ? filteredArticles.map((a) => {
                  const displayName = stripArchivedDisplayPrefix(a.articleLabel);
                  const archived = isCatalogueArticleArchived(a);
                  return (
                  <button
                    key={`art-${a.articleId}`}
                    type="button"
                    title={a.articleLabel !== displayName ? a.articleLabel : undefined}
                    className={cn('orion-catalogue-nav-item', selectedId === a.articleId && 'is-active')}
                    onClick={() => onSelect(a.articleId, 'article')}
                  >
                    <div className="orion-catalogue-nav-item-name">{displayName}</div>
                    <div className="orion-catalogue-nav-item-ref">{a.articleId}</div>
                    <div className="orion-catalogue-nav-item-meta">
                      {a.family || a.category}
                      <br />
                      {a.activeCount} chips · {a.variableCount} var.
                    </div>
                    <div className="orion-catalogue-nav-item-badges">
                      {archived ? (
                        <span className="orion-catalogue-badge is-off">Archivé</span>
                      ) : (
                        <span className={cn('orion-catalogue-badge', a.status === 'published' ? 'is-published' : 'is-draft')}>
                          {adminStatusLabel(a.status)}
                        </span>
                      )}
                      {!archived && a.visiblePos ? (
                        <span className="orion-catalogue-badge is-pos">POS</span>
                      ) : null}
                      {!archived && a.status === 'published' && !a.visiblePos ? (
                        <span className="orion-catalogue-badge is-off">Masqué</span>
                      ) : null}
                      {a.anomalyCount > 0 ? (
                        <span className="orion-catalogue-badge is-warn">{a.anomalyCount} anom.</span>
                      ) : null}
                    </div>
                  </button>
                  );
                })
              : null}

            {showModels && listMode === 'all' && filteredTemplates.length > 0 ? (
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground px-1 pt-2">Modèles</p>
            ) : null}

            {showModels
              ? filteredTemplates.map((t) => (
                  <button
                    key={`tpl-${t.id}`}
                    type="button"
                    className={cn('orion-catalogue-nav-item', selectedId === t.id && 'is-active')}
                    onClick={() => onSelect(t.id, 'model')}
                  >
                    <div className="orion-catalogue-nav-item-name">{t.label}</div>
                    <div className="orion-catalogue-nav-item-ref">{t.id}</div>
                    <div className="orion-catalogue-nav-item-meta">
                      {t.family} · {t.calculationType}
                      <br />
                      {t.defaultVariables.length} variables
                    </div>
                    <div className="orion-catalogue-nav-item-badges">
                      <span className="orion-catalogue-badge is-draft">Modèle</span>
                    </div>
                  </button>
                ))
              : null}

            {showModels && listMode === 'models' && filteredTemplates.length === 0 ? (
              <p className="text-xs text-muted-foreground p-2">Aucun modèle trouvé.</p>
            ) : null}
          </>
        )}
      </div>
    </aside>
  );
}
