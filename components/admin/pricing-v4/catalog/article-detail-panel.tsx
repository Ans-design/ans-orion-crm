'use client';

import { memo } from 'react';
import { ArticlePricingCard } from '@/components/admin/article-pricing-card';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { ADMIN_UI } from '@/lib/administration/admin-ui-vocab';
import { resolveArticlePricingSection } from '@/lib/pricing/pricing-admin-ui';
import { AppButton } from '@/components/ui/app-ui';

type Props = {
  articleId: string | null;
  canEdit: boolean;
  onUpdated?: () => void;
  onEditArticle?: () => void;
  onArchiveArticle?: () => void;
  archiving?: boolean;
  /** Section fiche produit initiale (deep-links legacy inclus) */
  initialSection?: string;
  onDirtyChange?: (dirty: boolean) => void;
};

export const ArticleDetailPanel = memo(function ArticleDetailPanel({
  articleId,
  canEdit,
  onUpdated,
  onEditArticle: _onEditArticle,
  onArchiveArticle,
  archiving,
  initialSection,
  onDirtyChange,
}: Props) {
  void _onEditArticle;
  if (!articleId) {
    return (
      <AdminEmptyState
        title="Sélectionnez un produit"
        description="Recherchez par nom ou référence, puis ouvrez la fiche pour Modifier Général, Tarification ou Formule. Options et simulation sont dans leurs modules dédiés."
      />
    );
  }

  return (
    <div className="acat-detail-panel">
      {canEdit && onArchiveArticle && (
        <div className="acat-detail-toolbar">
          <AppButton
            type="button"
            variant="ghost"
            size="sm"
            className="acat-archive-btn"
            onClick={onArchiveArticle}
            disabled={archiving}
          >
            {archiving ? 'Archivage…' : ADMIN_UI.archive}
          </AppButton>
        </div>
      )}
      <ArticlePricingCard
        key={`${articleId}-${initialSection ?? ''}`}
        articleId={articleId}
        canEdit={canEdit}
        onUpdated={onUpdated}
        catalogMode
        initialSection={
          initialSection
            ? resolveArticlePricingSection(initialSection)
            : undefined
        }
        onDirtyChange={onDirtyChange}
      />
    </div>
  );
});
