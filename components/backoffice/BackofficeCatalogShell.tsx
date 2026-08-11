'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { uxToast } from '@/lib/ux/feedback';
import { administrationPath } from '@/lib/administration/routes';
import type { BackofficeUnifiedTabId } from '@/lib/pricing/backoffice-unified-tabs';
import '@/components/admin/pricing-v4/pricing-admin.css';
import '@/components/backoffice/backoffice-catalog.css';
import { BackofficeHeader } from './BackofficeHeader';
import { BackofficeArticleSidebar } from './BackofficeArticleSidebar';
import { BackofficeArticleEditor } from './BackofficeArticleEditor';
import { BackofficeContextPanel } from './BackofficeContextPanel';

type CatalogData = {
  families: { id: string; label: string; count: number }[];
  articles: {
    articleId: string;
    articleLabel: string;
    family: string;
    status: string;
    prixComplete: boolean;
    hasAnomaly: boolean;
  }[];
  total: number;
  anomalyCount: number;
  lastUpdated: string | null;
};

type SyncData = {
  posUpToDate: boolean;
  pendingChanges: number;
  lastPublishedAt: string | null;
  lastPublishedBy: string | null;
  status: string;
  message: string;
};

type Props = {
  canEdit: boolean;
  canView: boolean;
  initialArticleId?: string | null;
  onPublishConfig?: () => Promise<void>;
  onSyncCatalogConfig?: () => Promise<void>;
  publishing?: boolean;
  syncing?: boolean;
};

export function BackofficeCatalogShell({
  canEdit,
  canView,
  initialArticleId,
  onPublishConfig,
  onSyncCatalogConfig,
  publishing = false,
  syncing = false,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [sync, setSync] = useState<SyncData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [familyFilter, setFamilyFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(initialArticleId ?? searchParams.get('article'));
  const [editorTab, setEditorTab] = useState<BackofficeUnifiedTabId>('general');

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set('search', search.trim());
      if (statusFilter !== 'all') qs.set('status', statusFilter);
      if (familyFilter !== 'all') qs.set('family', familyFilter);

      const catR = await fetch(`/api/backoffice/catalog?${qs}`, { cache: 'no-store' });
      const catBody = await catR.json();
      if (catR.ok && catBody.ok) {
        const { sync: syncData, ...catalogData } = catBody.data;
        setCatalog(catalogData);
        if (syncData) {
          setSync({
            posUpToDate: syncData.posUpToDate,
            pendingChanges: syncData.pendingChanges,
            lastPublishedAt: syncData.lastPublishedAt,
            lastPublishedBy: syncData.lastPublishedBy,
            status: syncData.status,
            message: syncData.message,
          });
        }
      } else {
        uxToast.error(catBody.error?.message ?? 'Erreur catalogue');
      }
    } catch {
      uxToast.error('Erreur chargement backoffice');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, familyFilter]);

  useEffect(() => {
    if (!canView) return;
    const t = window.setTimeout(loadCatalog, search ? 280 : 0);
    return () => window.clearTimeout(t);
  }, [loadCatalog, canView, search, statusFilter, familyFilter]);

  const selectArticle = useCallback(
    (id: string) => {
      setSelectedId(id);
      router.replace(administrationPath('backoffice', id), { scroll: false });
    },
    [router],
  );

  const filteredArticles = useMemo(() => catalog?.articles ?? [], [catalog]);

  const selectedLabel = filteredArticles.find((a) => a.articleId === selectedId)?.articleLabel ?? null;

  const handlePublish = async () => {
    if (!canEdit) return;
    try {
      if (onPublishConfig) {
        await onPublishConfig();
      } else {
        const r = await fetch('/api/backoffice/publish', { method: 'POST' });
        const d = await r.json();
        if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Publication échouée');
        uxToast.success('Configuration publiée — POS à jour après refresh');
      }
      loadCatalog();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Publication impossible');
    }
  };

  const handleSync = async () => {
    if (!canEdit) return;
    try {
      if (onSyncCatalogConfig) {
        await onSyncCatalogConfig();
      } else {
        const r = await fetch('/api/backoffice/sync', { method: 'POST' });
        const d = await r.json();
        if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Sync échouée');
        uxToast.success('Catalogue synchronisé vers la base');
      }
      loadCatalog();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Synchronisation impossible');
    }
  };

  if (!canView) return null;

  const syncBadge = sync?.posUpToDate ? 'success' : sync?.pendingChanges ? 'warning' : 'info';

  return (
    <div className="bo-catalog-shell orion-page w-full max-w-none">
      <BackofficeHeader
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        familyFilter={familyFilter}
        onFamilyFilterChange={setFamilyFilter}
        families={catalog?.families ?? []}
        lastUpdated={catalog?.lastUpdated ?? null}
        syncStatus={sync?.message ?? 'Chargement…'}
        syncBadge={syncBadge}
        anomalyCount={catalog?.anomalyCount ?? 0}
        canEdit={canEdit}
        publishing={publishing}
        syncing={syncing}
        onPublish={handlePublish}
        onSync={handleSync}
        onShowAnomalies={() => setEditorTab('history')}
      />

      <div className="bo-catalog-body">
        <BackofficeArticleSidebar
          articles={filteredArticles}
          selectedId={selectedId}
          onSelect={selectArticle}
          loading={loading}
        />

        <BackofficeArticleEditor
          articleId={selectedId}
          canEdit={canEdit}
          onUpdated={loadCatalog}
          initialTab={editorTab}
          onTabChange={setEditorTab}
        />

        <BackofficeContextPanel
          articleId={selectedId}
          articleLabel={selectedLabel}
          sync={sync}
          anomalyCount={catalog?.anomalyCount ?? 0}
          onJumpTab={setEditorTab}
        />
      </div>
    </div>
  );
}
