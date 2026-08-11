'use client';

import { memo } from 'react';
import type { CatalogViewMode } from '@/lib/pricing/pricing-admin-ui';

type Props = {
  mode: CatalogViewMode;
  onChange: (mode: CatalogViewMode) => void;
};

export const ArticleViewToggle = memo(function ArticleViewToggle({ mode, onChange }: Props) {
  return (
    <div className="acat-view-toggle" role="group" aria-label="Mode d'affichage">
      <button
        type="button"
        className={`acat-view-btn${mode === 'chips' ? ' is-active' : ''}`}
        onClick={() => onChange('chips')}
        aria-pressed={mode === 'chips'}
        title="Vue chips compactes"
      >
        ⊞ Chips
      </button>
      <button
        type="button"
        className={`acat-view-btn${mode === 'list' ? ' is-active' : ''}`}
        onClick={() => onChange('list')}
        aria-pressed={mode === 'list'}
        title="Vue liste dense"
      >
        ☰ Liste
      </button>
    </div>
  );
});
