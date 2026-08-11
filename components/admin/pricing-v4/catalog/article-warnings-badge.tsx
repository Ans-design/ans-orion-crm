import { memo } from 'react';
import type { ArticleWarning } from './article-catalog-types';

type Props = {
  warnings: ArticleWarning[];
  max?: number;
};

export const ArticleWarningsBadge = memo(function ArticleWarningsBadge({ warnings, max = 2 }: Props) {
  if (!warnings.length) return null;
  const shown = warnings.slice(0, max);
  const extra = warnings.length - shown.length;

  return (
    <span className="acat-warn-group">
      {shown.map((w) => (
        <span
          key={w.id}
          className={`acat-badge acat-badge-xs ${w.severity === 'danger' ? 'acat-badge-danger' : 'acat-badge-warn'}`}
          title={w.label}
        >
          {w.label}
        </span>
      ))}
      {extra > 0 && (
        <span className="acat-badge acat-badge-xs acat-badge-muted">+{extra}</span>
      )}
    </span>
  );
});
