import type { TierArticleSummary } from '@/lib/server/modules/backoffice-v2/admin-backoffice-tiers.types';
import { adminStatusLabel } from '@/lib/administration/admin-ui-vocab';
import { OptionsEmptyState } from '../options/OptionsEmptyState';
import { OptionsLoadingState } from '../options/OptionsLoadingState';
import { AppButton } from '@/components/ui/app-ui';

type Props = {
  articles: TierArticleSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
  error?: string | null;
  onResetFilters?: () => void;
};

export function TierArticlesList({
  articles,
  selectedId,
  onSelect,
  loading,
  error,
  onResetFilters,
}: Props) {
  if (loading) return <OptionsLoadingState rows={8} />;

  if (error) {
    return (
      <OptionsEmptyState
        title="Erreur de chargement"
        description={error}
        actions={onResetFilters && (
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
        actions={onResetFilters && (
          <AppButton type="button" variant="ghost" className="text-xs" onClick={onResetFilters}>
            Réinitialiser filtres
          </AppButton>
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
            <span className="ab2-article-stat">Unité : {a.saleUnit}</span>
            <span className="ab2-article-stat">
              {a.tierCount > 0 ? `${a.tierCount} paliers` : 'Sans palier'}
            </span>
            {a.anomalyCount > 0 && <span className="ab2-badge ab2-badge-danger">{a.anomalyCount}</span>}
            {a.publicationStatus === 'published' ? (
              <span className="ab2-badge ab2-badge-success">{adminStatusLabel('published')}</span>
            ) : a.tierCount === 0 ? (
              <span className="ab2-badge ab2-badge-muted">À configurer</span>
            ) : (
              <span className="ab2-badge ab2-badge-muted">{adminStatusLabel('draft')}</span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
