/** Types partagés — Tarification Dynamique V4 */

export type PricingAnomalySeverity = 'info' | 'warning' | 'critical';

export type PricingAnomaly = {
  id: string;
  severity: PricingAnomalySeverity;
  articleId: string | null;
  source: string;
  message: string;
  recommendedAction: string;
  entityType?: string;
  entityId?: string;
};

export type PricingOverviewStats = {
  catalogueArticles: number;
  dynamicProfiles: number;
  publishedProfiles: number;
  draftProfiles: number;
  withoutPublishedFormula: number;
  withoutProfile: number;
  optionGroups: number;
  formulas: number;
  stockRules: number;
  urgencyRules: number;
  materialPrices: number;
  salePrices2026: number;
  salePrices2026Active: number;
  anomaliesCritical: number;
  anomaliesWarning: number;
  anomaliesInfo: number;
  fusionAnomaliesOpen: number;
};

/** Couverture moteur — profils tarifaires groupés par famille (Studio Prix). */
export type PricingFamilyCoverage = {
  family: string;
  profiles: number;
  published: number;
  draft: number;
};

export type PricingEngineMode = 'dynamic' | 'legacy' | 'forced' | 'none';

export type UnifiedPriceRequest = {
  articleId: string;
  config: Record<string, unknown>;
  qty?: number;
  prixForce?: number;
  totalForce?: number;
  priceReason?: string;
  useDraftFormula?: boolean;
  skipDynamic?: boolean;
};

export type UnifiedPriceResult = {
  prixUnitaire: number;
  totalHT: number;
  totalTTC: number;
  pricingMode: PricingEngineMode;
  engine: string;
  formulaApplied?: string;
  pipeline?: Record<string, unknown>;
  rulesApplied?: string[];
};

/** Onglets unifiés — une seule entrée sidebar « Moteur de prix » */
export const PRICING_V4_TABS = [
  { id: 'overview', label: 'Vue d\'ensemble' },
  { id: 'engine', label: 'Moteur prix', primary: true },
  { id: 'migration', label: 'Migration PRIX 2026' },
  { id: 'settings', label: 'Paramètres globaux' },
  { id: 'anomalies', label: 'Anomalies' },
] as const;

export type PricingV4TabId = (typeof PRICING_V4_TABS)[number]['id'];

/** Rétro-compat URLs / anciens onglets */
export const PRICING_TAB_ALIASES: Record<string, PricingV4TabId> = {
  articles: 'engine',
  simulator: 'engine',
  materials: 'settings',
  variables: 'settings',
  features: 'settings',
  'legacy-tarifs': 'settings',
  audit: 'anomalies',
  tarification: 'engine',
  prix2026: 'migration',
};

export function resolvePricingTab(raw: string | null): PricingV4TabId {
  if (!raw) return 'engine';
  if (PRICING_V4_TABS.some((t) => t.id === raw)) return raw as PricingV4TabId;
  const mapped = PRICING_TAB_ALIASES[raw];
  if (mapped) return mapped;
  return 'engine';
}
