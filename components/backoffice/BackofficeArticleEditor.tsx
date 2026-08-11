'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArticlePricingCard } from '@/components/admin/article-pricing-card';
import { LazySyncCenterPanel } from '@/components/admin/pricing-v4/backoffice-tab-panels';
import type { ArticlePricingSectionId } from '@/lib/pricing/pricing-admin-ui';
import {
  BACKOFFICE_UNIFIED_TABS,
  PRICING_SUB_SECTIONS,
  UNIFIED_TAB_DEFAULT_SECTION,
  VARIABLES_SUB_SECTIONS,
  type BackofficeUnifiedTabId,
} from '@/lib/pricing/backoffice-unified-tabs';

type Props = {
  articleId: string | null;
  canEdit: boolean;
  onUpdated: () => void;
  initialTab?: BackofficeUnifiedTabId;
  onTabChange?: (tab: BackofficeUnifiedTabId) => void;
};

export function BackofficeArticleEditor({
  articleId,
  canEdit,
  onUpdated,
  initialTab = 'general',
  onTabChange,
}: Props) {
  const [tab, setTab] = useState<BackofficeUnifiedTabId>(initialTab);
  const [section, setSection] = useState<ArticlePricingSectionId>(UNIFIED_TAB_DEFAULT_SECTION.general);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab, articleId]);

  useEffect(() => {
    setSection(UNIFIED_TAB_DEFAULT_SECTION[tab]);
  }, [tab, articleId]);

  const subSections = useMemo(() => {
    if (tab === 'variables') return VARIABLES_SUB_SECTIONS;
    if (tab === 'pricing') return PRICING_SUB_SECTIONS;
    return [];
  }, [tab]);

  const selectTab = (id: BackofficeUnifiedTabId) => {
    setTab(id);
    onTabChange?.(id);
  };

  if (!articleId) {
    return (
      <div className="bo-catalog-editor">
        <div className="bo-empty">
          <p className="font-medium text-foreground mb-1">Sélectionnez un article</p>
          <p>Choisissez un article dans le catalogue pour modifier variables, prix, stock et synchronisation POS.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="bo-catalog-editor">
      <nav className="bo-unified-tabs" aria-label="Fiche article">
        {BACKOFFICE_UNIFIED_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`bo-unified-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => selectTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {subSections.length > 0 && (
        <nav className="bo-sub-tabs" aria-label="Sous-sections">
          {subSections.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`bo-unified-tab${section === s.id ? ' active' : ''}`}
              onClick={() => setSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>
      )}

      <div className="bo-editor-scroll">
        {tab === 'sync' ? (
          <LazySyncCenterPanel />
        ) : (
          <ArticlePricingCard
            key={`${articleId}-${tab}`}
            articleId={articleId}
            canEdit={canEdit}
            onUpdated={onUpdated}
            catalogMode
            activeSection={section}
            onActiveSectionChange={setSection}
            hideSectionNav
          />
        )}
      </div>
    </main>
  );
}
