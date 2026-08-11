/** Ligne variable/chip — une valeur d'option avec contexte article + groupe */
export type ChipTableRow = {
  id: string;
  groupId: string;
  articleId: string;
  articleLabel: string;
  articleFamily: string;
  blockKey: string;
  blockLabel: string;
  fieldKey: string;
  label: string;
  active: boolean;
  visiblePos: boolean;
  impactsPrice: boolean;
  impactsStock: boolean;
  impactsProduction: boolean;
  isInformational: boolean;
  archived: boolean;
  priceModifier: number;
  source: string;
  sortOrder: number;
  excelRowId?: string | null;
  fieldType?: string;
};

export type ChipArticleSummary = {
  articleId: string;
  articleLabel: string;
  family: string;
  category: string;
  status: string;
  active: boolean;
  visiblePos: boolean;
  variableCount: number;
  activeCount: number;
  archivedCount: number;
  priceImpactCount: number;
  indicativeCount: number;
  anomalyCount: number;
  dataSource: 'database' | 'catalogue' | 'hybrid';
  /** Catégorie POS normalisée (id) */
  categoryId?: string;
  /** true si famille / catégorie incohérente */
  categoryNeedsReview?: boolean;
  suggestedCategory?: string;
  articleType?: string;
  priceMode?: string;
};

export type ArticleChipsPayload = {
  article: {
    articleId: string;
    articleLabel: string;
    family: string;
    status: string;
  };
  counts: {
    total: number;
    active: number;
    archived: number;
    priceImpact: number;
    indicative: number;
  };
  blocks: {
    blockKey: string;
    blockLabel: string;
    rows: ChipTableRow[];
  }[];
  rows: ChipTableRow[];
};

export type ChipsGlobalPayload = {
  rows: ChipTableRow[];
  total: number;
};

export type OptionsArticlesListPayload = {
  articles: ChipArticleSummary[];
  stats: {
    totalArticles: number;
    articlesWithChips: number;
    totalChips: number;
    activeChips: number;
    archivedChips: number;
    pricingChips: number;
    indicativeChips: number;
  };
};
