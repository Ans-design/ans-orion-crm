export { AdminCatalogueShell } from './AdminCatalogueShell';
export { AdminHeader } from './AdminHeader';
export type { SyncBadgeStatus } from './AdminHeader';
export { AdminSidebar } from './AdminSidebar';
export { KpiCards } from './KpiCards';
export type { KpiId, KpiItem } from './KpiCards';
export { PillTabs } from './PillTabs';
export type { PillTab } from './PillTabs';
export {
  CatalogStudioNav,
  CATALOG_STUDIOS,
  CATALOG_STUDIOS_VISIBLE,
  canonicalizeStudio,
  studioToDefaultTab,
  tabToStudio,
} from './CatalogStudioNav';
export type { CatalogStudioId } from './CatalogStudioNav';
export { PricingFamilyCards } from './PricingFamilyCards';
export { PricingStudioNav, resolvePricingStudioSection, PRICING_STUDIO_SECTIONS_VISIBLE } from './PricingStudioNav';
export type { PricingStudioSectionId, PricingStudioVisibleSectionId } from './PricingStudioNav';
/** Barre sources — fichier conservé, plus rendu dans Studio Prix. */
export { CpsSourcesBar } from './CpsSourcesBar';
/** Overview studio — fichier conservé ; redirect cockpit (tab=vue). */
export { PricingStudioOverview } from './PricingStudioOverview';
export { PricingEnginesGallery } from './PricingEnginesGallery';
export { PricingFormulasStudio } from './PricingFormulasStudio';
export { PricingCalculsStudio } from './PricingCalculsStudio';
export { FormulesMoteursWorkspace } from './FormulesMoteursWorkspace';
/** Panel Versions — fichier conservé, plus branché sur la nav Studio Prix. */
export { PricingVersionsPanel } from './PricingVersionsPanel';
export { CpsStudioFrame } from './CpsStudioFrame';
export { MaterialStockStudio } from './MaterialStockStudio';
export type { MaterialStockMode } from './MaterialStockStudio';
export { CockpitStudio } from './CockpitStudio';
/**
 * Ancien bandeau « Prochaines actions utiles » — retiré du cockpit
 * (doublonne DOMAINES). Conservé exporté pour deep-links / imports legacy.
 */
export { CockpitNextActions } from './CockpitNextActions';
export { SmartDataGrid } from './SmartDataGrid';
export type { SmartColumn } from './SmartDataGrid';
export { InlineEditableCell } from './InlineEditableCell';
export { AnsArticlesChrome, ansAtInitials, ansAtToneFor } from './AnsArticlesChrome';
export type { AnsAtFamilyTab, AnsAtMetric } from './AnsArticlesChrome';
export { MarginIndicator, computeMarginPct } from './MarginIndicator';
export { StockStatusBadge, resolveStockTone } from './StockStatusBadge';
export { EntityDrawer } from './EntityDrawer';
export { ReapproExpressBar } from './ReapproExpressBar';
export { ExcelManager } from './ExcelManager';
export { PosPublicationParityPanel } from './PosPublicationParityPanel';
export { AnomalyCenter } from './AnomalyCenter';
export { OptionsChipsEditor } from './OptionsChipsEditor';
export { OptionsFinitionsHealthStrip } from './OptionsFinitionsHealthStrip';
/** Panel SI/ALORS — fichier conservé ; Dependencies rend PricingArticlesWorkspace. */
export { OptionsDependenciesPanel } from './OptionsDependenciesPanel';
