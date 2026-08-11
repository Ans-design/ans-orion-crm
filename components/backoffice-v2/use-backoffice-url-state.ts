'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { AdminBackofficeTabId } from '@/lib/server/modules/backoffice-v2/admin-backoffice.types';
import { moduleById, moduleForTab } from '@/lib/backoffice/admin-modules';
import type { AdminBackofficeModuleId } from '@/lib/backoffice/admin-modules';
import { macroForModule } from '@/lib/administration/admin-macro-modules';
import {
  buildBackofficeUrl,
  parseArticlesView,
  parseModuleView,
  type BackofficeArticlesView,
  type BackofficeModuleView,
} from '@/lib/backoffice/backoffice-url';

function parseTab(raw: string | null): AdminBackofficeTabId {
  const ids: AdminBackofficeTabId[] = [
    'overview', 'articles', 'chips', 'tiers', 'pricing-custom', 'materials', 'prices2026', 'variables',
    'pos-functions', 'versions', 'access', 'anomalies', 'sync', 'audit',
  ];
  return ids.includes(raw as AdminBackofficeTabId) ? (raw as AdminBackofficeTabId) : 'overview';
}

export function useBackofficeUrlState() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const patchUrl = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      router.replace(buildBackofficeUrl(searchParams, patch), { scroll: false });
    },
    [router, searchParams],
  );

  const articleId = searchParams.get('article');
  const moduleView = parseModuleView(searchParams);
  const articlesView = parseArticlesView(searchParams);
  const tab = parseTab(searchParams.get('tab'));

  const setModuleView = useCallback(
    (view: BackofficeModuleView) => {
      patchUrl({ view: view === 'global' ? 'global' : null });
    },
    [patchUrl],
  );

  const setArticleId = useCallback(
    (id: string | null) => {
      patchUrl({ article: id });
    },
    [patchUrl],
  );

  const selectTab = useCallback(
    (id: AdminBackofficeTabId, extra?: Record<string, string | null | undefined>) => {
      const mod = moduleForTab(id);
      const macro = macroForModule(mod.id);
      patchUrl({
        tab: id,
        module: mod.id,
        macro,
        hub: null,
        ...extra,
      });
    },
    [patchUrl],
  );

  const selectModule = useCallback(
    (moduleId: AdminBackofficeModuleId) => {
      const mod = moduleById(moduleId);
      const macro = macroForModule(moduleId);
      patchUrl({ module: moduleId, tab: mod.defaultTab, macro, hub: null });
    },
    [patchUrl],
  );

  const setArticlesView = useCallback(
    (view: BackofficeArticlesView) => {
      patchUrl({ view: view === 'price-table' ? 'price-table' : null });
    },
    [patchUrl],
  );

  return {
    searchParams,
    patchUrl,
    articleId,
    moduleView,
    articlesView,
    tab,
    setModuleView,
    setArticleId,
    selectTab,
    selectModule,
    setArticlesView,
  };
}
