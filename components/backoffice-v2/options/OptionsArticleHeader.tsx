import type { ArticleChipsPayload } from '@/lib/server/modules/backoffice-v2/admin-backoffice-chips.types';
import { statusLabelFr } from '@/lib/pricing/formula-display';

type Props = {
  data: ArticleChipsPayload;
};

export function OptionsArticleHeader({ data }: Props) {
  const { article, counts } = data;
  return (
    <div className="ab2-options-article-header">
      <div>
        <h3 className="ab2-options-article-title">Variables / Chips de {article.articleLabel}</h3>
        <p className="ab2-options-article-sub">
          {article.family} · <code>{article.articleId}</code> · {statusLabelFr(article.status)}
        </p>
      </div>
      <div className="ab2-options-counts">
        <span className="ab2-count-badge"><strong>{counts.total}</strong> total</span>
        <span className="ab2-count-badge ab2-count-badge--success"><strong>{counts.active}</strong> actives</span>
        <span className="ab2-count-badge ab2-count-badge--muted"><strong>{counts.archived}</strong> archivées</span>
        <span className="ab2-count-badge ab2-count-badge--price"><strong>{counts.priceImpact}</strong> impact prix</span>
        <span className="ab2-count-badge ab2-count-badge--indicative"><strong>{counts.indicative}</strong> indicatives</span>
      </div>
    </div>
  );
}
