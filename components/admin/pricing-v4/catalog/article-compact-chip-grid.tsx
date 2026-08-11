'use client';

import { memo } from 'react';
import type { EnrichedArticleRow } from './article-catalog-types';
import { ArticleStatusBadge } from './article-status-badge';
import { stripArchivedDisplayPrefix } from '@/lib/administration/catalogue-display-label';

type Props = {
  rows: EnrichedArticleRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  focusedIndex: number;
  onFocusIndexChange: (i: number) => void;
};

export const ArticleCompactChipGrid = memo(function ArticleCompactChipGrid({
  rows,
  selectedId,
  onSelect,
  focusedIndex,
  onFocusIndexChange,
}: Props) {
  return (
    <div className="acat-chip-scroll" role="listbox" aria-label="Articles — vue chips">
      <div className="acat-chip-grid">
        {rows.map((row, i) => {
          const selected = selectedId === row.articleId;
          const focused = focusedIndex === i;
          return (
            <button
              key={row.articleId}
              type="button"
              role="option"
              aria-selected={selected}
              data-article-id={row.articleId}
              className={`acat-chip${selected ? ' is-selected' : ''}${focused ? ' is-focused' : ''}`}
              onClick={() => onSelect(row.articleId)}
              onMouseEnter={() => onFocusIndexChange(i)}
              title={
                row.warnings.length
                  ? row.warnings.map((w) => w.label).join(' · ')
                  : row.articleLabel
              }
            >
              <span className="acat-chip-check" aria-hidden>✓</span>
              <span className="acat-chip-icon" aria-hidden>{row.icon}</span>
              <span className="acat-chip-label">{stripArchivedDisplayPrefix(row.articleLabel)}</span>
              <ArticleStatusBadge status={row.status} compact />
              {row.warnings.length > 0 && (
                <span className="acat-chip-warn-dot" aria-label={`${row.warnings.length} alerte(s)`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});
