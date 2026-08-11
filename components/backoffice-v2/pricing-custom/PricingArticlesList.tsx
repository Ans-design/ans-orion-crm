import type { PricingArticleSummary } from '@/lib/server/modules/backoffice-v2/admin-backoffice-pricing.types';
import { AppButton } from '@/components/ui/app-ui';
import { OptionsEmptyState } from '../options/OptionsEmptyState';
import { OptionsLoadingState } from '../options/OptionsLoadingState';

type Props = {
  articles: PricingArticleSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
  error?: string | null;
  onResetFilters?: () => void;
};

export function PricingArticlesList({
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
          <div className="ab2-options-article-family">{a.family} · {a.calculationType}</div>
          <div className="ab2-options-article-meta">
            <span className="ab2-article-stat">{a.priceImpactCount} impact prix</span>
            <span className="ab2-article-stat">{a.indicativeCount} indicatif</span>
            {a.formulaStatus === 'published' ? (
              <span className="ab2-badge ab2-badge-success">Formule v{a.formulaVersion}</span>
            ) : a.formulaStatus === 'draft' ? (
              <span className="ab2-badge ab2-badge-muted">Formule brouillon</span>
            ) : (
              <span className="ab2-badge ab2-badge-danger">Sans formule</span>
            )}
            {a.anomalyCount > 0 && <span className="ab2-badge ab2-badge-danger">{a.anomalyCount}</span>}
          </div>
        </button>
      ))}
    </div>
  );
}
