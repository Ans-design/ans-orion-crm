export type TierMode =
  | 'unit_price'
  | 'percent'
  | 'fixed_discount'
  | 'coefficient'
  | 'total_band'
  | 'formula';

export type TierPublicationStatus = 'published' | 'draft' | 'catalogue' | 'none';

export type TierArticleSummary = {
  articleId: string;
  articleLabel: string;
  family: string;
  category: string;
  status: string;
  active: boolean;
  visiblePos: boolean;
  calculationType: string;
  saleUnit: string;
  qtyMin: number | null;
  tierCount: number;
  activeTierCount: number;
  tiersSummary: string;
  publicationStatus: TierPublicationStatus;
  anomalyCount: number;
  dataSource: 'database' | 'catalogue' | 'hybrid' | 'none';
  updatedAt: string | null;
};

export type TierTableRow = {
  id: string;
  articleId: string;
  variantKey: string;
  variantLabel: string | null;
  minQty: number;
  maxQty: number | null;
  value: number | null;
  unitPrice: number | null;
  discountPercent: number;
  mode: TierMode;
  active: boolean;
  source: string | null;
  sortOrder: number;
};

export type TierVariantSummary = {
  variantKey: string;
  variantLabel: string;
  tierCount: number;
  /** Prix catalogue format/laize (PRIX 2026) pour simuler les remises %. */
  listPrixBase?: number | null;
};

export type TierValidationResult = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
};

export type TierSimulationLine = {
  tierId: string;
  label: string;
  sampleQty: number;
  unitPrice: number;
  lineTotal: number;
  isHighlighted: boolean;
};

export type ArticleTiersPayload = {
  article: {
    articleId: string;
    articleLabel: string;
    family: string;
    category: string;
    status: string;
    calculationType: string;
    saleUnit: string;
    qtyMin: number | null;
    prixBase: number | null;
    /** Ex. « PRIX 2026 · onglet Carte de visite » si grille Excel */
    prixBaseSource?: string | null;
    publicationStatus: TierPublicationStatus;
  };
  tierMode: TierMode;
  tiers: TierTableRow[];
  variants: TierVariantSummary[];
  validation: TierValidationResult;
  simulations: TierSimulationLine[];
  counts: {
    total: number;
    active: number;
    archived: number;
  };
};

export type TiersArticlesListPayload = {
  articles: TierArticleSummary[];
  stats: {
    totalArticles: number;
    articlesWithTiers: number;
    totalTiers: number;
    activeTiers: number;
    withoutTiers: number;
  };
};

export type TiersGlobalRow = {
  articleId: string;
  articleLabel: string;
  family: string;
  category: string;
  saleUnit: string;
  calculationType: string;
  qtyMin: number | null;
  tierCount: number;
  firstTierMin: number | null;
  lastTierMax: number | null;
  tierMode: TierMode;
  publicationStatus: TierPublicationStatus;
  anomalyCount: number;
  updatedAt: string | null;
};

export type TiersGlobalPayload = {
  rows: TiersGlobalRow[];
  total: number;
};
