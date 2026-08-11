/**
 * Design system ANS ORION — exports unifiés (alias App*).
 * Utiliser ces exports pour éviter la duplication de styles.
 */

export { Button as AppButton, buttonVariants as appButtonVariants } from '@/components/ui/button';
export { Card as AppCard, CardContent as AppCardContent, CardHeader as AppCardHeader } from '@/components/ui/card';
export { Input as AppInput } from '@/components/ui/input';
export { PasswordField as AppPasswordField } from '@/components/forms/password-field';
export { Textarea as AppTextarea } from '@/components/ui/textarea';
export { Checkbox as AppCheckbox } from '@/components/ui/checkbox';
export { Select as AppSelect } from '@/components/ui/select';
export { Badge as AppBadge } from '@/components/ui/badge';
export { StatBadge as AppStatusBadge } from '@/components/ui/stat-badge';
export { Dialog as AppModal } from '@/components/ui/dialog';
export { Sheet as AppDrawer } from '@/components/ui/sheet';
export { Table as AppTable } from '@/components/ui/table';
export { Tabs as AppTabs } from '@/components/ui/tabs';
export { Tooltip as AppTooltip } from '@/components/ui/tooltip';
export { Skeleton as AppSkeleton } from '@/components/ui/skeleton';
export { EmptyState as AppEmptyState } from '@/components/ui/empty-state';
export { LoadingState as AppLoadingState } from '@/components/ui/loading-state';
export { RouteLoading as AppRouteLoading } from '@/components/ui/route-loading';
export { SectionHeader as AppSectionHeader } from '@/components/ui/section-header';
export { ErrorState as AppErrorState } from '@/components/ui/error-state';
export { ConfirmDialog as AppConfirmDialog } from '@/components/ui/confirm-dialog';
export { KpiCard as AppKpiCard, ActivityTile as AppActivityTile } from '@/components/ui/kpi-card';
export { PageHeader as AppPageHeader } from '@/components/layouts/page-header';
export { ModuleHeader as AppModuleHeader } from '@/components/layouts/module-header';
export { SearchInput as AppSearchBar } from '@/components/ui/search-input';
export { FilterSelect as AppFilterSelect } from '@/components/ui/filter-select';
export { ListSkeleton as AppListSkeleton } from '@/components/ui/list-skeleton';
export { ListPagination as AppListPagination } from '@/components/ui/list-pagination';
export { AppFormModal, AppFormModalFooter } from '@/components/ui/app-form-modal';
export { AppFilterBar } from '@/components/ui/app-filter-bar';
export { PageContainer as AppPageContainer, OrionPageStack, KpiGridLayout as AppKpiGridLayout, CardGridLayout as AppCardGridLayout, FormGridLayout as AppFormGridLayout, ToolbarLayout as AppToolbarLayout, TabsPanelLayout as AppTabsPanelLayout, ActionGroupLayout as AppActionGroupLayout } from '@/components/layouts/page-container';
export { SyncStateBadge as AppSyncStateBadge } from '@/components/ui/sync-state-badge';
export type { SyncUiStatus } from '@/components/ui/sync-state-badge';
export { KpiValue as AppKpiValue, KpiStatusBadge as AppKpiStatusBadge } from '@/components/ui/kpi-value';
export { ModuleToolbar as AppModuleToolbar } from '@/components/ui/module-toolbar';
export { EntityDataToolbar } from '@/components/ui/entity-data-toolbar';
export { EntityModuleDataBar } from '@/components/ui/entity-module-data-bar';
export { EntityListPageShell } from '@/components/ui/entity-list-page-shell';
export { ModuleShell as AppModuleShell } from '@/components/ui/module-shell';
export { KpiGrid as AppKpiGrid } from '@/components/ui/kpi-grid';
export {
  ResponsiveDataView as AppResponsiveDataView,
  AdaptiveOverlay as AppAdaptiveOverlay,
  ResponsiveKpiGrid as AppResponsiveKpiGrid,
  OrionHorizontalRail as AppHorizontalRail,
  ResponsiveMasterDetail as AppResponsiveMasterDetail,
  ResponsivePageHeader as AppResponsivePageHeader,
  ResponsiveToolbar as AppResponsiveToolbar,
  ResponsiveFilterPanel as AppResponsiveFilterPanel,
  BottomActionStackProvider as AppBottomActionStackProvider,
  StickyActionBar as AppStickyActionBar,
} from '@/components/responsive';
export { DataListRow as AppDataListRow } from '@/components/ui/data-list-row';
export { TableRowActions as AppTableRowActions } from '@/components/ui/table-row-actions';
export { ViewToggle as AppViewToggle } from '@/components/ui/view-toggle';
export { KPI_TONES, kpiToneColor, type KpiTone } from '@/lib/design/kpi-tones';
export {
  ORION_SURFACE,
  ORION_SURFACE_BG,
  ORION_SURFACE_STATE,
} from '@/lib/design/surface-tokens';
export { ANS_DESIGN_DIRECTION } from '@/lib/design/design-direction';
export {
  ORION_SECTION_SPACE,
  ORION_PAGE,
  ORION_HEADER,
  ORION_TOOLBAR,
  ORION_TABS,
  ORION_TABLE,
  ORION_FORM,
  ORION_CARD_PAD,
  ORION_CONTROL_HEIGHT,
  ORION_KPI,
  ORION_GRID_KPI,
  ORION_GRID_CARDS,
  ORION_GRID_FORM,
  ORION_SIDEBAR,
  ORION_BADGE,
  ORION_TAB,
} from '@/lib/design/spacing-system';
export {
  SectionBlock as AppSectionBlock,
  SectionCard as AppSectionCard,
  SectionStack as AppSectionStack,
  MetricGrid as AppMetricGrid,
  MetricCell as AppMetricCell,
  AlertCard as AppAlertCard,
  StatusGrid as AppStatusGrid,
  StatusPill as AppStatusPill,
} from '@/components/ui/section-layout';
export {
  Breadcrumb as AppBreadcrumb,
  BreadcrumbList as AppBreadcrumbList,
  BreadcrumbItem as AppBreadcrumbItem,
  BreadcrumbLink as AppBreadcrumbLink,
  BreadcrumbPage as AppBreadcrumbPage,
  BreadcrumbSeparator as AppBreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export { ORION_COLORS, ORION_RADIUS, ORION_MOTION, ORION_Z, ORION_FOCUS_RING, ORION_CARD_CLASS, ORION_INTERACTIVE_CLASS } from '@/lib/design/tokens';
export { TYPO } from '@/lib/design/typography';
export { PageTitle as AppPageTitleText, SectionTitle as AppSectionTitleText, CardTitle as AppCardTitleText, MetaText as AppMetaText, AmountText as AppAmountText, CodeText as AppCodeText } from '@/components/ui/typography';
export { formatNumberFr, formatPriceAr, formatPercentFr, formatUnitFr, FR_THIN, FR_NBSP, ELLIPSIS } from '@/lib/format/french-typography';
export { getStatusMeta, statusBadgeClasses } from '@/lib/design/status-meta';
export { STATUS_TONE, ACTION_INFO_CLASS, statusBadgeClass } from '@/lib/ui/status-styles';
export { AppToggle, type AppToggleTone } from '@/components/ui/app-toggle';
