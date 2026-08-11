'use client';

import dynamic from 'next/dynamic';
import { AppButton } from '@/components/ui/app-ui';
import { LoadingState } from '@/components/ui/loading-state';

function TabSkeleton({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="pta-empty-state !py-10">
      <LoadingState message={label} size="sm" className="!py-0 bg-transparent border-0 shadow-none" />
    </div>
  );
}

export const LazySanteHealthStrip = dynamic(
  () => import('@/components/admin/admin-control-health-strip').then((m) => m.AdminControlHealthStrip),
  { loading: () => <TabSkeleton label="Chargement santé…" /> },
);

export const LazySanteTab = dynamic(
  () => import('@/components/admin/admin-control-sante-tab').then((m) => m.AdminControlSanteTab),
  { loading: () => <TabSkeleton label="Chargement santé…" /> },
);

export const LazyArticlesWorkspace = dynamic(
  () => import('@/components/admin/pricing-v4/pricing-articles-workspace').then((m) => m.PricingArticlesWorkspace),
  { loading: () => <TabSkeleton label="Chargement catalogue…" /> },
);

export const LazyApercusTab = dynamic(
  () => import('@/components/admin/admin-control-apercus-tab').then((m) => m.AdminControlApercusTab),
  { loading: () => <TabSkeleton label="Chargement aperçus…" /> },
);

export const LazyChipsTab = dynamic(
  () => import('@/components/admin/admin-control-chips-tab').then((m) => m.AdminControlChipsTab),
  { loading: () => <TabSkeleton label="Chargement chips…" /> },
);

export const LazyFusionMaterials = dynamic(
  () => import('@/components/admin/fusion-admin-panels').then((m) => m.FusionMaterialsPanel),
  { loading: () => <TabSkeleton label="Chargement matières…" /> },
);

export const LazyDynamicPricingTab = dynamic(
  () => import('@/components/admin/admin-control-dynamic-pricing-tab').then((m) => m.AdminControlDynamicPricingTab),
  { loading: () => <TabSkeleton label="Chargement prix…" /> },
);

export const LazyFusionSalePrices = dynamic(
  () => import('@/components/admin/fusion-admin-panels').then((m) => m.FusionSalePricesPanel),
  { loading: () => <TabSkeleton label="Chargement grille prix…" /> },
);

export const LazyTarifsLegacyGrid = dynamic(
  () => import('@/app/(app)/tarifs/components/TarifsLegacyGrid').then((m) => m.TarifsLegacyGrid),
  { loading: () => <TabSkeleton label="Chargement paliers…" /> },
);

export const LazyVariablesTab = dynamic(
  () => import('@/components/admin/admin-control-settings-tabs').then((m) => m.AdminControlVariablesTab),
  { loading: () => <TabSkeleton label="Chargement variables…" /> },
);

export const LazyFonctionsTab = dynamic(
  () => import('@/components/admin/admin-control-settings-tabs').then((m) => m.AdminControlFonctionsTab),
  { loading: () => <TabSkeleton label="Chargement fonctions POS…" /> },
);

export const LazyVersionsTab = dynamic(
  () => import('@/components/admin/admin-control-settings-tabs').then((m) => m.AdminControlVersionsTab),
  { loading: () => <TabSkeleton label="Chargement versions…" /> },
);

export const LazyAccessPanel = dynamic(
  () => import('@/components/admin/access-requests-panel').then((m) => m.AccessRequestsAdminPanel),
  { loading: () => <TabSkeleton label="Chargement accès…" /> },
);

export const LazyAnomaliesPanel = dynamic(
  () => import('@/components/admin/pricing-v4/pricing-anomalies-panel').then((m) => m.PricingAnomaliesPanel),
  { loading: () => <TabSkeleton label="Chargement anomalies…" /> },
);

export const LazyArticleTemplatesPanel = dynamic(
  () => import('@/components/admin/pricing-v4/panels/article-templates-panel').then((m) => m.ArticleTemplatesPanel),
  { loading: () => <TabSkeleton label="Chargement modèles…" /> },
);

export const LazyWorkflowStatusPanel = dynamic(
  () => import('@/components/admin/pricing-v4/panels/workflow-status-panel').then((m) => m.WorkflowStatusPanel),
  { loading: () => <TabSkeleton label="Chargement flux…" /> },
);

export const LazyImportExportPanel = dynamic(
  () => import('@/components/admin/pricing-v4/panels/import-export-panel').then((m) => m.ImportExportPanel),
  { loading: () => <TabSkeleton label="Chargement import/export…" /> },
);

export const LazyDataManagementPanel = dynamic(
  () => import('@/components/admin/pricing-v4/data-management-panel').then((m) => m.DataManagementPanel),
  { loading: () => <TabSkeleton label="Chargement gouvernance données…" /> },
);

export const LazyDataQualityPanel = dynamic(
  () => import('@/components/admin/pricing-v4/data-quality-panel').then((m) => m.DataQualityPanel),
  { loading: () => <TabSkeleton label="Chargement qualité données…" /> },
);

export const LazySyncCenterPanel = dynamic(
  () => import('@/components/admin/pricing-v4/panels/sync-center-panel').then((m) => m.SyncCenterPanel),
  { loading: () => <TabSkeleton label="Chargement sync…" /> },
);

export const LazyLogisticsCarriersPanel = dynamic(
  () => import('@/components/admin/pricing-v4/logistics-carriers-panel').then((m) => m.LogisticsCarriersPanel),
  { loading: () => <TabSkeleton label="Chargement transporteurs…" /> },
);

export function BackofficeErrorState({
  title,
  detail,
  onRetry,
}: {
  title: string;
  detail?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="pta-empty-state border border-destructive/30 bg-destructive/5 rounded-[7px] p-6">
      <div className="icon">⚠️</div>
      <div className="title">{title}</div>
      {detail && <p className="text-xs text-muted-foreground mt-2 max-w-md text-center">{detail}</p>}
      {onRetry && (
        <AppButton type="button" variant="default" size="sm" className="mt-4" onClick={onRetry}>
          Réessayer
        </AppButton>
      )}
    </div>
  );
}
