'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { uxToast } from '@/lib/ux/feedback';
import { getApiErrorMessage } from '@/lib/api-client';
import { hasPermission } from '@/lib/auth/permissions';
import {
  administrationPathForTab,
  ADMINISTRATION_SECTIONS,
  resolveAdminSection,
  sectionToTab,
} from '@/lib/administration/routes';
import { resolvePricingAdminTab, type PricingAdminTopTabId } from '@/lib/pricing/pricing-admin-ui';
import { useBackofficeConfig } from '@/lib/hooks/use-backoffice-config';
import { SyncStatusLine } from '@/components/ux/sync-status-line';
import { UX_MSG } from '@/lib/ux/messages';
import '@/components/admin/pricing-v4/pricing-admin.css';
import { PricingAdminShell } from '@/components/admin/pricing-v4/pricing-admin-shell';
import { AdminControlCatalogToolbar } from '@/components/admin/admin-control-catalog-toolbar';
import { groupChipsByField } from '@/lib/admin-config/group-chips';
import { BackofficeKpiStrip } from '@/components/admin/pricing-v4/backoffice-kpi-strip';
import { BackofficeLoading } from '@/components/admin/pricing-v4/backoffice-panel-state';
import type { PricingOverviewStats } from '@/lib/pricing/pricing-types';
import {
  BackofficeErrorState,
  LazyAccessPanel,
  LazyAnomaliesPanel,
  LazyApercusTab,
  LazyArticlesWorkspace,
  LazyChipsTab,
  LazyDynamicPricingTab,
  LazyFusionMaterials,
  LazyFusionSalePrices,
  LazyFonctionsTab,
  LazySanteHealthStrip,
  LazySanteTab,
  LazyTarifsLegacyGrid,
  LazyVariablesTab,
  LazyVersionsTab,
  LazyArticleTemplatesPanel,
  LazyWorkflowStatusPanel,
  LazyImportExportPanel,
  LazySyncCenterPanel,
  LazyDataManagementPanel,
  LazyLogisticsCarriersPanel,
  LazyDataQualityPanel,
} from '@/components/admin/pricing-v4/backoffice-tab-panels';

export type BackofficeNavMode = 'legacy-query' | 'administration-path';

type Props = {
  /** Section slug pour mode administration-path (ex. vue-ensemble) */
  section?: string | null;
  navMode?: BackofficeNavMode;
};

export function BackofficeWorkspace({ section, navMode = 'legacy-query' }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const role = (session?.user as { role?: string })?.role ?? 'user';
  const canEdit = role === 'admin';
  const canView = role === 'admin' || role === 'manager';
  const canViewMargin = hasPermission(role, 'pos:view_margin');

  const initialTab =
    navMode === 'administration-path'
      ? sectionToTab(resolveAdminSection(section))
      : resolvePricingAdminTab(searchParams.get('tab'));

  const [tab, setTab] = useState<PricingAdminTopTabId>(initialTab);
  const [articleFocus, setArticleFocus] = useState<string | null>(searchParams.get('article'));
  const [anomalyCount, setAnomalyCount] = useState(0);
  const [publishedCount, setPublishedCount] = useState(0);
  const [overviewStats, setOverviewStats] = useState<PricingOverviewStats | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [chipSearch] = useState('');
  const [showArchivedChips, setShowArchivedChips] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [previewRole, setPreviewRole] = useState<'commercial' | 'admin'>('commercial');
  const [syncingCatalogueDb, setSyncingCatalogueDb] = useState(false);

  const breadcrumb =
    navMode === 'administration-path'
      ? ADMINISTRATION_SECTIONS[resolveAdminSection(section)]?.breadcrumb
      : undefined;

  const adminSection =
    navMode === 'administration-path' ? resolveAdminSection(section) : null;

  const sectionPanel =
    adminSection === 'modeles-articles' ? 'templates'
    : adminSection === 'flux-statuts' ? 'workflow'
    : adminSection === 'import-export' ? 'import-export'
    : adminSection === 'synchronisation' ? 'sync'
    : adminSection === 'data-management' ? 'data-management'
    : adminSection === 'logistique' ? 'logistics'
    : null;

  const needsDraft = ['sante', 'articles', 'apercus', 'chips', 'variables', 'fonctions'].includes(tab);
  const needsDynamic = tab === 'sante' || tab === 'articles' || tab === 'anomalies';

  const {
    config,
    health,
    versions,
    fusionStatus,
    prodStatus,
    dynamicPricingStats,
    auditLogs,
    syncStatus,
    loading,
    loadError,
    saving,
    publishing,
    syncingCatalog,
    publish,
    saveDraft,
    syncCatalog,
    rollback,
    load,
    setPreviewField,
    setChipField,
    updateVariable,
    toggleFeature,
    lastPublishDrift,
    syncRefreshKey,
  } = useBackofficeConfig(role, canView, { withDraft: needsDraft, withDynamicPricing: needsDynamic });

  const latestPublished = versions.find((v) => v.status === 'published') ?? versions[0];
  const syncBusy = saving || publishing || syncingCatalog || syncingCatalogueDb;

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!canView) router.push('/dashboard');
  }, [canView, router, sessionStatus]);

  useEffect(() => {
    if (navMode === 'administration-path') {
      const tabFromQuery = searchParams.get('tab');
      if (tabFromQuery) {
        const resolved = resolvePricingAdminTab(tabFromQuery);
        setTab(resolved);
        const art = searchParams.get('article');
        router.replace(administrationPathForTab(resolved, art), { scroll: false });
        if (art) setArticleFocus(art);
        return;
      }
      const resolvedSection = resolveAdminSection(section);
      const resolvedTab = sectionToTab(resolvedSection);
      setTab(resolvedTab);
      const art = searchParams.get('article');
      if (art) setArticleFocus(art);
      return;
    }
    const raw = searchParams.get('tab');
    const resolved = resolvePricingAdminTab(raw);
    setTab(resolved);
    if (raw && raw !== resolved) {
      const art = searchParams.get('article');
      const q = art ? `&article=${art}` : '';
      router.replace(`/admin/pricing?tab=${resolved}${q}`, { scroll: false });
    }
    const art = searchParams.get('article');
    if (art) {
      setArticleFocus(art);
      if (resolved !== 'articles') {
        setTab('articles');
        router.replace(`/admin/pricing?tab=articles&article=${art}`, { scroll: false });
      }
    }
  }, [searchParams, router, navMode, section]);

  useEffect(() => {
    (async () => {
      setOverviewLoading(true);
      try {
        const r = await fetch('/api/pricing/overview');
        const d = await r.json();
        if (r.ok && d.stats) {
          setOverviewStats(d.stats);
          setAnomalyCount((d.stats.anomaliesCritical ?? 0) + (d.stats.anomaliesWarning ?? 0));
          setPublishedCount(d.stats.publishedProfiles ?? 0);
        }
      } catch { /* ignore */ }
      setOverviewLoading(false);
    })();
  }, []);

  const selectTab = useCallback(
    (id: PricingAdminTopTabId) => {
      setTab(id);
      if (navMode === 'administration-path') {
        router.push(administrationPathForTab(id), { scroll: false });
      } else {
        router.replace(`/admin/pricing?tab=${id}`, { scroll: false });
      }
    },
    [router, navMode],
  );

  const openArticle = useCallback(
    (articleId: string) => {
      setArticleFocus(articleId);
      setTab('articles');
      if (navMode === 'administration-path') {
        router.push(administrationPathForTab('articles', articleId), { scroll: false });
      } else {
        router.replace(`/admin/pricing?tab=articles&article=${articleId}`, { scroll: false });
      }
    },
    [router, navMode],
  );

  const exportJson = useCallback(async () => {
    try {
      const r = await fetch('/api/dynamic-pricing');
      const d = await r.json();
      if (!r.ok) {
        uxToast.error('Export impossible');
        return;
      }
      const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orion-pricing-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      uxToast.success('Export JSON téléchargé');
    } catch {
      uxToast.error('Erreur export JSON');
    }
  }, []);

  const syncCatalogueDb = useCallback(async () => {
    if (!canEdit) return;
    setSyncingCatalogueDb(true);
    try {
      const r = await fetch('/api/backoffice/articles/sync-catalogue', { method: 'POST' });
      const d = await r.json();
      if (r.ok) {
        uxToast.success(`Catalogue → DB : ${d.created} créé(s), ${d.skipped} déjà présents`);
        load();
      } else uxToast.error(getApiErrorMessage(d, 'Sync catalogue échouée'), 'Sync catalogue échouée');
    } catch {
      uxToast.error('Erreur réseau');
    }
    setSyncingCatalogueDb(false);
  }, [canEdit, load]);

  const filteredArticles = useMemo(() => {
    if (!config) return [];
    let list = Object.values(config.articles);
    if (filterCat !== 'all') list = list.filter((a) => a.category === filterCat);
    if (catalogSearch) {
      const q = catalogSearch.toLowerCase();
      list = list.filter((a) => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q));
    }
    return list.slice(0, 200);
  }, [config, filterCat, catalogSearch]);

  const previewArticles = useMemo(() => {
    if (!config) return { visible: 0, greyed: 0, hidden: 0 };
    let visible = 0;
    let greyed = 0;
    let hidden = 0;
    const isAdminPreview = previewRole === 'admin';
    for (const art of Object.values(config.articles)) {
      if (art.visibility === 'HIDDEN') { hidden++; continue; }
      if (art.visibility === 'ADMIN_ONLY' && !isAdminPreview) { hidden++; continue; }
      if (art.visibility === 'DISABLED_VISIBLE') greyed++;
      else visible++;
    }
    return { visible, greyed, hidden };
  }, [config, previewRole]);

  if (!canView) return null;

  const chipList = config ? Object.values(config.chips) : [];
  const filteredChips = chipList.filter((c) => {
    if (!showArchivedChips && c.archived) return false;
    if (!chipSearch) return true;
    return c.label.toLowerCase().includes(chipSearch.toLowerCase());
  });

  const needsConfig = ['sante', 'apercus', 'chips', 'variables', 'fonctions'].includes(tab);
  const configLoading = needsConfig && loading && !config && !loadError;

  return (
    <div className="orion-page w-full max-w-none">
      <div className="pta-page-wrap">
        {breadcrumb && (
          <p className="text-xs text-muted-foreground mb-2 px-1">{breadcrumb}</p>
        )}
        <PricingAdminShell
          activeTab={tab}
          onTabChange={selectTab}
          anomalyCount={anomalyCount}
          onExportJson={exportJson}
          canEdit={canEdit}
          publishedCount={publishedCount}
          onSaveDraft={canEdit ? saveDraft : undefined}
          onPublish={canEdit ? publish : undefined}
          saving={saving}
          publishing={publishing}
          description="Configuration catalogue, tarifs dynamiques, synchronisation POS et santé système — sans modifier le code métier."
          kpiStrip={(
            <div className="space-y-3">
              <SyncStatusLine
                label={
                  syncBusy
                    ? UX_MSG.syncInProgress
                    : anomalyCount > 0
                      ? `${anomalyCount} anomalie${anomalyCount > 1 ? 's' : ''} à traiter`
                      : 'Backoffice opérationnel'
                }
                detail={
                  latestPublished
                    ? `Dernière publication v${latestPublished.version}${
                        latestPublished.publishedAt
                          ? ` · ${new Date(latestPublished.publishedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}`
                          : ''
                      }`
                    : 'Aucune publication enregistrée'
                }
                busy={syncBusy}
                tone={anomalyCount > 0 ? 'warn' : 'ok'}
                onRefresh={async () => {
                  await load();
                  uxToast.success('Données mises à jour');
                }}
              />
              <BackofficeKpiStrip
                stats={overviewStats}
                loading={overviewLoading}
                anomalyCount={anomalyCount}
                publishedCount={publishedCount}
              />
            </div>
          )}
        >
          {sectionPanel === 'templates' && (
            <LazyArticleTemplatesPanel
              canEdit={canEdit}
              onCreateFromTemplate={(articleId) => {
                openArticle(articleId);
              }}
            />
          )}

          {sectionPanel === 'workflow' && (
            <LazyWorkflowStatusPanel />
          )}

          {sectionPanel === 'import-export' && (
            <LazyImportExportPanel canEdit={canEdit} />
          )}

          {sectionPanel === 'sync' && (
            <LazySyncCenterPanel
              onRetrySync={canEdit ? syncCatalog : undefined}
              onSyncCatalogueDb={canEdit ? syncCatalogueDb : undefined}
              syncing={syncingCatalog}
              syncingCatalogueDb={syncingCatalogueDb}
              refreshKey={syncRefreshKey}
              lastPublishDrift={lastPublishDrift}
            />
          )}

          {sectionPanel === 'data-management' && (
            <LazyDataManagementPanel />
          )}

          {sectionPanel === 'logistics' && (
            <LazyLogisticsCarriersPanel canEdit={canEdit} />
          )}

          {!sectionPanel && tab === 'sante' && (
            <>
              {loadError && !health && (
                <BackofficeErrorState
                  title="Santé système indisponible"
                  detail={loadError}
                  onRetry={() => load()}
                />
              )}
              {health && (
                <>
                  <LazySanteHealthStrip health={health} fusionStatus={fusionStatus} />
                  <LazySanteTab
                    health={health}
                    prodStatus={prodStatus}
                    fusionStatus={fusionStatus}
                    dynamicPricingStats={dynamicPricingStats}
                    auditLogs={auditLogs}
                    syncStatus={syncStatus}
                    role={role}
                    canEdit={canEdit}
                    syncingCatalog={syncingCatalog}
                    onSyncCatalog={syncCatalog}
                    onSelectTab={(t) => selectTab(resolvePricingAdminTab(t))}
                  />
                </>
              )}
              {!health && !loadError && loading && (
                <BackofficeLoading message="Chargement santé système…" />
              )}
            </>
          )}

          {!sectionPanel && tab === 'articles' && (
            <LazyArticlesWorkspace canEdit={canEdit} initialArticleId={articleFocus} />
          )}

          {!sectionPanel && tab === 'apercus' && config && (
            <>
              <AdminControlCatalogToolbar
                tab="apercus"
                search={catalogSearch}
                onSearchChange={setCatalogSearch}
                filterCat={filterCat}
                onFilterCatChange={setFilterCat}
                previewRole={previewRole}
                onPreviewRoleChange={setPreviewRole}
                previewStats={previewArticles}
              />
              <LazyApercusTab
                articles={filteredArticles}
                productPreviews={config.productPreviews}
                canEdit={canEdit}
                onSetPreviewField={setPreviewField}
              />
            </>
          )}
          {!sectionPanel && tab === 'apercus' && configLoading && (
            <BackofficeLoading message="Chargement aperçus…" />
          )}

          {!sectionPanel && tab === 'chips' && config && (
            <LazyChipsTab
              filteredChips={filteredChips}
              chipGroups={groupChipsByField(config.chips)}
              archivedCount={chipList.filter((c) => c.archived).length}
              showArchivedChips={showArchivedChips}
              onShowArchivedChipsChange={setShowArchivedChips}
              canEdit={canEdit}
              onSetChipField={setChipField}
            />
          )}
          {!sectionPanel && tab === 'chips' && configLoading && (
            <BackofficeLoading message="Chargement des chips…" />
          )}

          {!sectionPanel && tab === 'matieres' && (
            <LazyFusionMaterials canEdit={canEdit} />
          )}

          {!sectionPanel && tab === 'prix2026' && (
            <div className="space-y-5">
              <div className="pta-info-box">
                Archive PRIX 2026 — migration vers le moteur dynamique article par article.
              </div>
              <LazyDynamicPricingTab canEdit={canEdit} migrationOnly />
              <LazyFusionSalePrices canEdit={canEdit} />
              <div className="space-y-3 pt-2">
                <h3 className="orion-section-title">Paliers legacy (migration)</h3>
                <p className="text-xs text-muted-foreground">
                  Archive lecture — calcul POS = profils publiés (Articles finis). Édition désactivée.
                </p>
                <LazyTarifsLegacyGrid readOnly />
              </div>
            </div>
          )}

          {!sectionPanel && tab === 'variables' && config && (
            <LazyVariablesTab
              config={config}
              canEdit={canEdit}
              canViewMargin={canViewMargin}
              onUpdateVariable={updateVariable}
            />
          )}
          {!sectionPanel && tab === 'variables' && configLoading && (
            <BackofficeLoading message="Chargement des variables…" />
          )}

          {!sectionPanel && tab === 'fonctions' && config && (
            <LazyFonctionsTab
              config={config}
              canEdit={canEdit}
              onToggleFeature={toggleFeature}
            />
          )}
          {!sectionPanel && tab === 'fonctions' && configLoading && (
            <BackofficeLoading message="Chargement des fonctions POS…" />
          )}

          {!sectionPanel && tab === 'versions' && (
            <LazyVersionsTab versions={versions} canEdit={canEdit} onRollback={rollback} />
          )}

          {!sectionPanel && tab === 'acces' && (
            <LazyAccessPanel canEdit={canEdit} />
          )}

          {!sectionPanel && tab === 'anomalies' && (
            <>
              <LazyAnomaliesPanel onOpenArticle={openArticle} />
              <LazyDataQualityPanel compact />
            </>
          )}
        </PricingAdminShell>
      </div>
    </div>
  );
}
