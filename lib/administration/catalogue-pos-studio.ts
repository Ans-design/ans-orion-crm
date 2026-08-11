/**
 * Catalogue & POS — studio unifié (navigation, onglets, URL)
 */
export type CatalogueNavMode = 'all' | 'articles' | 'models';

export type CatalogueStudioTab = 'chips' | 'variables' | 'dependencies' | 'history';

export const CATALOGUE_STUDIO_TABS: { id: CatalogueStudioTab; label: string }[] = [
  { id: 'chips', label: 'Configuration' },
  { id: 'variables', label: 'Variables' },
  { id: 'dependencies', label: 'Dépendances' },
  { id: 'history', label: 'Historique' },
];

export const DEFAULT_CATALOGUE_STUDIO_TAB: CatalogueStudioTab = 'chips';

const LEGACY_STUDIO_TABS = new Set(['infos', 'mockup', 'pos', 'materials', 'prices']);

export function parseCatalogueNavMode(raw: string | null): CatalogueNavMode {
  if (raw === 'models') return 'models';
  if (raw === 'articles') return 'articles';
  return 'all';
}

export function parseCatalogueStudioTab(raw: string | null): CatalogueStudioTab {
  if (!raw || LEGACY_STUDIO_TABS.has(raw)) return DEFAULT_CATALOGUE_STUDIO_TAB;
  const ids = CATALOGUE_STUDIO_TABS.map((t) => t.id);
  return ids.includes(raw as CatalogueStudioTab) ? (raw as CatalogueStudioTab) : DEFAULT_CATALOGUE_STUDIO_TAB;
}

export type CatalogueArticleHealth = {
  hasVariables: boolean;
  hasChips: boolean;
  hasPrice: boolean;
  hasMaterials: boolean;
  hasMockup: boolean;
  hasAnomalies: boolean;
  readyToPublish: boolean;
};

export function computeCatalogueHealth(input: {
  variableCount: number;
  activeCount: number;
  priceImpactCount: number;
  anomalyCount: number;
  basePrintPrice?: number | null;
  materialsCount?: number;
  mockupActive?: boolean;
}): CatalogueArticleHealth {
  const hasVariables = input.variableCount > 0;
  const hasChips = input.activeCount > 0;
  const hasPrice = input.priceImpactCount > 0 || (input.basePrintPrice != null && input.basePrintPrice > 0);
  const hasMaterials = (input.materialsCount ?? 0) > 0;
  const hasMockup = input.mockupActive !== false;
  const hasAnomalies = input.anomalyCount > 0;
  const readyToPublish =
    hasVariables && hasChips && hasPrice && !hasAnomalies;
  return { hasVariables, hasChips, hasPrice, hasMaterials, hasMockup, hasAnomalies, readyToPublish };
}

/** URL directe du studio Catalogue & POS (sans page hub intermédiaire). */
export const CATALOGUE_POS_STUDIO_URL = '/administration/catalogue-pos?studio=chips';
