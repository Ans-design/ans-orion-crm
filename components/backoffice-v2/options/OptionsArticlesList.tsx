import type { ChipArticleSummary } from '@/lib/server/modules/backoffice-v2/admin-backoffice-chips.types';
import { adminStatusLabel } from '@/lib/administration/admin-ui-vocab';import { OptionsEmptyState } from './OptionsEmptyState';
import { OptionsLoadingState } from './OptionsLoadingState';
import { AppButton } from '@/components/ui/app-ui';

type Props = {
  articles: ChipArticleSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
  error?: string | null;
  onResetFilters?: () => void;
  onOpenGlobal?: () => void;
};

export function OptionsArticlesList({
  articles,
  selectedId,
  onSelect,
  loading,
  error,
  onResetFilters,
  onOpenGlobal,
}: Props) {
  if (loading) return <OptionsLoadingState rows={8} />;

  if (error) {
    return (
      <OptionsEmptyState
        title="Erreur de chargement"
        description={error}
        actions={(
          <AppButton type="button" variant="ghost" className="text-xs" onClick={onResetFilters}>
            Réinitialiser filtres
          </AppButton>
        )}
      />
    );
  }

  if (articles.length === 0) {
    return (
      <OptionsEmptyState
        title="Aucun article trouvé"
        description="Aucun article ne correspond à ces filtres."
        actions={(
          <>
            {onResetFilters && (
              <AppButton type="button" variant="ghost" className="text-xs" onClick={onResetFilters}>
                Réinitialiser filtres
              </AppButton>
            )}
            {onOpenGlobal && (
              <AppButton type="button" variant="ghost" className="text-xs" onClick={onOpenGlobal}>
                Vue globale
              </AppButton>
            )}
          </>
        )}
      />
    );
  }

  return (
    <div className="ab2-options-article-list">
      {articles.map((a) => (
        <button
          key={a.articleId}
          type="button"
          className={`ab2-options-article-item${selectedId === a.articleId ? ' is-active' : ''}`}
          onClick={() => onSelect(a.articleId)}
          title={a.articleLabel}
        >
          <div className="ab2-options-article-top">
            <div className="ab2-options-article-name">{a.articleLabel}</div>
            <div className="ab2-options-article-code">{a.articleId}</div>
          </div>
          <div className="ab2-options-article-family">{a.family}</div>
          <div className="ab2-options-article-meta">
            <span className="ab2-article-stat">{a.variableCount} chips</span>
            <span className="ab2-article-stat">{a.activeCount} actifs</span>
            {a.anomalyCount > 0 && <span className="ab2-badge ab2-badge-danger">{a.anomalyCount}</span>}
            {a.visiblePos && <span className="ab2-badge ab2-badge-info">POS</span>}
            <span className={`ab2-badge ${a.status === 'published' ? 'ab2-badge-success' : 'ab2-badge-muted'}`}>
              {a.status === 'published' ? adminStatusLabel('published') : a.status === 'catalogue' ? 'Catalogue' : adminStatusLabel('draft')}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
