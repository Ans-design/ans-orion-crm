'use client';

import { memo } from 'react';
import { ARTICLE_FAMILY_FILTERS, type ArticleFamilyFilterId } from '@/lib/pricing/pricing-admin-ui';

type Props = {
  value: ArticleFamilyFilterId;
  onChange: (id: ArticleFamilyFilterId) => void;
};

export const ArticleFilterBar = memo(function ArticleFilterBar({ value, onChange }: Props) {
  return (
    <div className="acat-filter-bar" role="group" aria-label="Filtres rapides">
      {ARTICLE_FAMILY_FILTERS.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => onChange(f.id)}
          className={`acat-filter-chip${value === f.id ? ' is-active' : ''}`}
          aria-pressed={value === f.id}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
});
