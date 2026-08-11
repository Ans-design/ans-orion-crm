'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { uxToast } from '@/lib/ux/feedback';
import { buildBackofficeUrl, isBackofficeHubMode, parseAdminMacro, parseArticlesView, parseBackofficeModule } from '@/lib/backoffice/backoffice-url';
import { moduleById, moduleForTab } from '@/lib/backoffice/admin-modules';
import {
  macroById,
  macroForModule,
  macroHubUrl,
  resolveActiveMicro,
} from '@/lib/administration/admin-macro-modules';
import type { AdminBackofficeModuleId } from '@/lib/backoffice/admin-modules';
import type { AdminBackofficeOverview, AdminBackofficeTabId } from '@/lib/server/modules/backoffice-v2/admin-backoffice.types';
import { AdminBackofficeTopbar } from './AdminBackofficeTopbar';
import { AdminBackofficeStats } from './AdminBackofficeStats';
import { BackofficeArticlePriceTable } from './articles/BackofficeArticlePriceTable';
import { PricingArticlesWorkspace } from '@/components/admin/pricing-v4/pricing-articles-workspace';
import {
  LazyAccessPanel,
  LazyAnomaliesPanel,
  LazyFonctionsTab,
  LazyFusionSalePrices,
  LazyImportExportPanel,
  LazySyncCenterPanel,
  LazyVariablesTab,
  LazyVersionsTab,
} from '@/components/admin/pricing-v4/backoffice-tab-panels';
import { OptionsChipsWorkspace } from './options/OptionsChipsWorkspace';
import { TiersByArticleWorkspace } from './pricing-tiers/TiersByArticleWorkspace';
import { CustomPricingWorkspace } from './pricing-custom/CustomPricingWorkspace';
import { MaterialsPricingWorkspace } from './pricing-custom/MaterialsPricingWorkspace';
import { BackofficeAuditLogPanel } from './audit/BackofficeAuditLogPanel';
import { BackofficeLegacyScope } from './BackofficeLegacyScope';
import { useBackofficeConfig } from '@/lib/hooks/use-backoffice-config';
import { BackofficeLoading } from '@/components/admin/pricing-v4/backoffice-panel-state';
import { AdminModuleTabs } from './ui/AdminModuleTabs';
import { AdminModuleHub } from './ui/AdminModuleHub';
import { useBackofficeUrlState } from './use-backoffice-url-state';
import { AdminCommandPalette, useAdminCommandPalette } from './ui/AdminCommandPalette';
import '@/components/backoffice-v2/admin-backoffice.css';

function parseTab(raw: string | null): AdminBackofficeTabId {
  const ids: AdminBackofficeTabId[] = [
    'overview', 'articles', 'chips', 'tiers', 'pricing-custom', 'materials', 'prices2026', 'variables',
    'pos-functions', 'versions', 'access', 'anomalies', 'sync', 'audit',
  ];
  return ids.includes(raw as AdminBackofficeTabId) ? (raw as AdminBackofficeTabId) : 'overview';
}

export function AdminBackofficeShell() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const role = (session?.user as { role?: string })?.role ?? 'user';
  const canEdit = role === 'admin';
  const canView = role === 'admin' || role === 'manager';

  const [tab, setTab] = useState<AdminBackofficeTabId>(() => parseTab(searchParams.get('tab')));
  const [activeModuleId, setActiveModuleId] = useState<AdminBackofficeModuleId | null>(
    () => parseBackofficeModule(searchParams),
  );
  const { open: cmdOpen, setOpen: setCmdOpen } = useAdminCommandPalette();
  const urlState = useBackofficeUrlState();
  const [articlesView, setArticlesView] = useState<'cards' | 'price-table'>(() => parseArticlesView(searchParams));
  const urlSyncedRef = useRef(false);
  const [overview, setOverview] = useState<AdminBackofficeOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const articleFocus = searchParams.get('article');

  const {
    config,
    versions,
    loading: configLoading,
    updateVariable,
    toggleFeature,
    rollback,
  } = useBackofficeConfig(role, canView, { withDraft: true, withDynamicPricing: false });

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!canView) router.push('/dashboard');
  }, [canView, router, sessionStatus]);

  useEffect(() => {
    const macro = parseAdminMacro(searchParams);
    const mod = parseBackofficeModule(searchParams);
    const currentTab = parseTab(searchParams.get('tab'));
    if (
      (macro === 'catalog' || macro === 'matieres' || macro === 'formules')
      && searchParams.get('hub') === '1'
    ) {
      const href =
        macro === 'formules'
          ? '/administration/catalogue-prix-stock?studio=calculs&tab=engines'
          : '/administration/catalogue-prix-stock?studio=matieres';
      router.replace(href, { scroll: false });
      return;
    }
    if (macro === 'overview' && searchParams.get('hub') === '1') {
      router.replace('/administration/vue-ensemble', { scroll: false });
      return;
    }
    if (macro === 'stock' && searchParams.get('hub') === '1') {
      router.replace('/administration/matieres', { scroll: false });
      return;
    }
    if (macro === 'production' && searchParams.get('hub') === '1') {
      router.replace('/administration/production-flux', { scroll: false });
      return;
    }
    if (macro === 'catalog' && mod === 'catalogue' && (currentTab === 'articles' || currentTab === 'chips')) {
      const article = searchParams.get('article');
      const studio = currentTab === 'chips' ? 'chips' : searchParams.get('view') === 'price-table' ? 'prices' : 'infos';
      const qs = new URLSearchParams({ studio });
      if (article) qs.set('article', article);
      router.replace(`/administration/catalogue-pos?${qs.toString()}`, { scroll: false });
    }
  }, [searchParams, router, sessionStatus]);

  useEffect(() => {
    const fromUrl = parseTab(searchParams.get('tab'));
    setTab(fromUrl);
    setActiveModuleId(parseBackofficeModule(searchParams) ?? moduleForTab(fromUrl).id);
    if (fromUrl === 'articles') {
      setArticlesView(parseArticlesView(searchParams));
    }
  }, [searchParams]);

  useEffect(() => {
    if (urlSyncedRef.current) return;
    if (isBackofficeHubMode(searchParams)) {
      urlSyncedRef.current = true;
      return;
    }
    if (!searchParams.get('tab') && !searchParams.get('macro')) {
      urlSyncedRef.current = true;
      router.replace(macroHubUrl('overview'), { scroll: false });
      return;
    }
    if (searchParams.get('tab') && !searchParams.get('macro')) {
      urlSyncedRef.current = true;
      const mod = moduleForTab(parseTab(searchParams.get('tab')));
      router.replace(
        buildBackofficeUrl(searchParams, { macro: macroForModule(mod.id), hub: null }),
        { scroll: false },
      );
    }
  }, [searchParams, router]);

  const selectTab = useCallback((id: AdminBackofficeTabId, extra?: Record<string, string | null | undefined>) => {
    const mod = moduleForTab(id);
    const macro = macroForModule(mod.id);
    setTab(id);
    setActiveModuleId(mod.id);
    if (id === 'articles' && extra?.view === 'price-table') {
      setArticlesView('price-table');
    } else if (id === 'articles' && (extra?.view === null || extra?.view === '' || extra?.view === 'cards')) {
      setArticlesView('cards');
    }
    urlState.selectTab(id, extra);
  }, [urlState]);

  const selectModule = useCallback((moduleId: AdminBackofficeModuleId) => {
    const mod = moduleById(moduleId);
    setActiveModuleId(moduleId);
    setTab(mod.defaultTab);
    urlState.selectModule(moduleId);
  }, [urlState]);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const r = await fetch('/api/admin-backoffice/overview', { cache: 'no-store' });
      const d = await r.json();
      if (r.ok && d.ok) setOverview(d.data);
    } catch { /* ignore */ }
    setOverviewLoading(false);
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  const publish = async () => {
    if (!canEdit) return;
    setPublishing(true);
    try {
      const r = await fetch('/api/admin-backoffice/publish', { method: 'POST' });
      const d = await r.json();
      if (r.ok && d.ok) {
        uxToast.success('Configuration publiée');
        loadOverview();
      } else uxToast.error(d.error?.message ?? 'Publication échouée');
    } catch {
      uxToast.error('Erreur réseau');
    }
    setPublishing(false);
  };

  const syncPos = async () => {
    if (!canEdit) return;
    setSyncing(true);
    try {
      const r = await fetch('/api/admin-backoffice/sync-pos', { method: 'POST' });
      const d = await r.json();
      if (r.ok && d.ok) {
        uxToast.success('Catalogue synchronisé');
        loadOverview();
      } else uxToast.error(d.error?.message ?? 'Sync échouée');
    } catch {
      uxToast.error('Erreur réseau');
    }
    setSyncing(false);
  };

  if (sessionStatus === 'loading') {
    return (
      <div className="ab2-app ab2-app-single ab2-shell flex items-center justify-center p-12">
        <p className="text-sm opacity-70">Chargement Administration Backoffice…</p>
      </div>
    );
  }

  if (!canView) return null;

  const anomalyCount = (overview?.anomaliesCritical ?? 0) + (overview?.anomaliesWarning ?? 0);
  const syncDirty = (overview?.unpublishedChanges ?? 0) > 0;
  const syncLabel = syncDirty
    ? `${overview?.unpublishedChanges} modif. non publiée(s)`
    : 'POS synchronisé';

  const resolvedModule = activeModuleId ? moduleById(activeModuleId) : moduleForTab(tab);
  const macroId = parseAdminMacro(searchParams) ?? macroForModule(resolvedModule.id);
  const macro = macroById(macroId);
  const hubMode = isBackofficeHubMode(searchParams);
  const activeMicro = hubMode
    ? null
    : resolveActiveMicro(macro, pathname, searchParams.toString());
  const isEmbeddedImport = resolvedModule.embeddedPanel === 'import-export';
  const useMicroDropdown = !hubMode && Boolean(activeMicro);

  const statusBadges: { label: string; tone: 'warn' | 'danger' | 'muted' }[] = [];
  if ((overview?.unpublishedChanges ?? 0) > 0) {
    statusBadges.push({ label: `${overview?.unpublishedChanges} brouillon(s)`, tone: 'warn' });
  }
  if ((overview?.anomaliesCritical ?? 0) > 0) {
    statusBadges.push({ label: `${overview?.anomaliesCritical} anomalie(s) critique(s)`, tone: 'danger' });
  }
  if ((overview?.materialsMissingPrice ?? 0) > 0) {
    statusBadges.push({ label: `${overview?.materialsMissingPrice} prix manquant(s)`, tone: 'warn' });
  }

  const renderTabContent = () => {
    if (isEmbeddedImport) {
      return (
        <BackofficeLegacyScope>
          <LazyImportExportPanel canEdit={canEdit} />
        </BackofficeLegacyScope>
      );
    }

    switch (tab) {
      case 'overview':
        return (
          <AdminBackofficeStats
            data={overview}
            loading={overviewLoading}
            onOpenAnomalies={() => selectTab('anomalies')}
            onOpenPriceTable={() => selectTab('articles', { view: 'price-table' })}
            onOpenMaterials={() => selectTab('materials')}
            onOpenSync={() => selectTab('sync')}
            onPublish={publish}
            onSync={syncPos}
          />
        );
      case 'articles':
        return articlesView === 'price-table' ? (
          <BackofficeArticlePriceTable canEdit={canEdit} initialArticleId={articleFocus} />
        ) : (
          <BackofficeLegacyScope>
            <PricingArticlesWorkspace canEdit={canEdit} initialArticleId={articleFocus} />
          </BackofficeLegacyScope>
        );
      case 'chips':
        return <OptionsChipsWorkspace canEdit={canEdit} initialArticleId={articleFocus} />;
      case 'tiers':
        return <TiersByArticleWorkspace canEdit={canEdit} initialArticleId={articleFocus} />;
      case 'pricing-custom':
        return (
          <CustomPricingWorkspace
            canEdit={canEdit}
            initialArticleId={articleFocus}
            onPublishGlobal={loadOverview}
            onSyncPos={syncPos}
          />
        );
      case 'materials':
        return <MaterialsPricingWorkspace canEdit={canEdit} articleId={articleFocus} />;
      case 'prices2026':
        return (
          <BackofficeLegacyScope>
            <p className="ab2-legacy-banner">
              Archive legacy — non utilisée pour le calcul POS. Migration vers Matières DB recommandée.
            </p>
            <LazyFusionSalePrices canEdit={canEdit} />
          </BackofficeLegacyScope>
        );
      case 'variables':
        return config ? (
          <BackofficeLegacyScope>
            <LazyVariablesTab
              config={config}
              canEdit={canEdit}
              canViewMargin={canEdit}
              onUpdateVariable={updateVariable}
            />
          </BackofficeLegacyScope>
        ) : configLoading ? <BackofficeLoading message="Chargement variables…" /> : null;
      case 'pos-functions':
        return config ? (
          <BackofficeLegacyScope>
            <LazyFonctionsTab config={config} canEdit={canEdit} onToggleFeature={toggleFeature} />
          </BackofficeLegacyScope>
        ) : configLoading ? <BackofficeLoading message="Chargement fonctions POS…" /> : null;
      case 'versions':
        return (
          <BackofficeLegacyScope>
            <LazyVersionsTab versions={versions} canEdit={canEdit} onRollback={rollback} />
          </BackofficeLegacyScope>
        );
      case 'access':
        return (
          <BackofficeLegacyScope>
            <LazyAccessPanel canEdit={canEdit} />
          </BackofficeLegacyScope>
        );
      case 'anomalies':
        return (
          <BackofficeLegacyScope>
            <LazyAnomaliesPanel
              onOpenArticle={(id) => selectTab('articles', { article: id, view: 'price-table' })}
            />
          </BackofficeLegacyScope>
        );
      case 'sync':
        return (
          <BackofficeLegacyScope>
            <LazySyncCenterPanel
              onRetrySync={syncPos}
              syncing={syncing}
              refreshKey={overview?.unpublishedChanges ?? 0}
            />
          </BackofficeLegacyScope>
        );
      case 'audit':
        return <BackofficeAuditLogPanel />;
      default:
        return null;
    }
  };

  return (
    <div className="ab2-app ab2-app-single orion-page w-full">
      <div className="ab2-workspace ab2-shell ab2-workspace-full">
        <AdminBackofficeTopbar
          activeTab={tab}
          activeModuleId={resolvedModule.id}
          macro={macro}
          activeMicro={activeMicro}
          hubMode={hubMode}
          engineVersion={overview?.engineVersion}
          lastSync={overview?.lastPublishedAt}
          canEdit={canEdit}
          publishing={publishing}
          syncing={syncing}
          onPublish={publish}
          onSync={syncPos}
          onOpenCommandPalette={() => setCmdOpen(true)}
          statusBadges={statusBadges}
        />

        <div className="ab2-content">
          {hubMode ? (
            <AdminModuleHub macro={macro} />
          ) : (
            <>
          {!isEmbeddedImport && !useMicroDropdown && resolvedModule.tabs.length > 0 && (
            <AdminModuleTabs
              module={resolvedModule}
              activeTab={tab}
              onSelectTab={selectTab}
              badgeCounts={{
                anomalies: anomalyCount,
                drafts: overview?.drafts,
                materialsDraft: overview?.materialsDraft,
                unpublished: overview?.unpublishedChanges,
              }}
            />
          )}

          {tab === 'articles' && !isEmbeddedImport && (
            <div className="ab2-sub-view-toggle mb-4">
              <div className="ab2-view-toggle">
                <button
                  type="button"
                  className={articlesView === 'cards' ? 'active' : ''}
                  onClick={() => selectTab('articles', { view: null })}
                >
                  Cartes catalogue
                </button>
                <button
                  type="button"
                  className={articlesView === 'price-table' ? 'active' : ''}
                  onClick={() => selectTab('articles', { view: 'price-table' })}
                >
                  Tableau prix
                </button>
              </div>
            </div>
          )}

          {renderTabContent()}
            </>
          )}
        </div>
      </div>

      <AdminCommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onNavigate={(moduleId, tabId) => {
          if (tabId) selectTab(tabId);
          else selectModule(moduleId);
        }}
      />
    </div>
  );
}
