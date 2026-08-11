'use client';

type ArticleRow = {
  articleId: string;
  articleLabel: string;
  family: string;
  status: string;
  prixComplete: boolean;
  hasAnomaly: boolean;
};

type Props = {
  articles: ArticleRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
};

export function BackofficeArticleSidebar({ articles, selectedId, onSelect, loading }: Props) {
  return (
    <aside className="bo-catalog-sidebar">
      <div className="bo-catalog-sidebar-head">Catalogue ({articles.length})</div>
      <div className="bo-catalog-sidebar-scroll">
        {loading && <p className="text-xs text-muted-foreground p-2">Chargement…</p>}
        {!loading && articles.length === 0 && (
          <div className="bo-empty">Aucun article pour ces filtres</div>
        )}
        {articles.map((a) => (
          <button
            key={a.articleId}
            type="button"
            className={`bo-article-row${selectedId === a.articleId ? ' active' : ''}`}
            onClick={() => onSelect(a.articleId)}
          >
            <span className="bo-article-row-name">{a.articleLabel}</span>
            <span className="bo-article-row-meta">
              <span>{a.family}</span>
              <span className={`bo-badge ${a.status === 'published' ? 'bo-badge-success' : 'bo-badge-warning'}`}>
                {a.status === 'published' ? 'Actif' : 'Brouillon'}
              </span>
              {!a.prixComplete && <span className="bo-badge bo-badge-warning">Prix incomplet</span>}
              {a.hasAnomaly && <span className="bo-badge bo-badge-danger">Anomalie</span>}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}
