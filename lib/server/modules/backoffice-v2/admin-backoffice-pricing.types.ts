import type { ArticlePricingSectionId } from '@/lib/pricing/pricing-admin-ui';

export type PricingArticleSummary = {
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
  prixBase: number | null;
  variableCount: number;
  priceImpactCount: number;
  indicativeCount: number;
  formulaStatus: 'published' | 'draft' | 'none';
  formulaVersion: number | null;
  tiersCount: number;
  tiersSummary: string;
  anomalyCount: number;
  publicationStatus: 'published' | 'draft' | 'catalogue' | 'none';
  dataSource: 'database' | 'catalogue' | 'hybrid' | 'none';
  updatedAt: string | null;
};

export type PricingArticlesListPayload = {
  articles: PricingArticleSummary[];
  stats: {
    totalArticles: number;
    withFormula: number;
    withoutFormula: number;
    withAnomalies: number;
    published: number;
    draft: number;
  };
};

export type PricingVariableMatrixRow = {
  id: string;
  groupId: string;
  blockLabel: string;
  fieldKey: string;
  groupLabel: string;
  optionLabel: string;
  priceModifier: number;
  impactsPrice: boolean;
  isInformational: boolean;
  active: boolean;
  source: string;
};

export type PricingBusinessRuleRow = {
  id: string;
  ruleName: string;
  ruleType: string;
  message: string | null;
  priority: number;
  active: boolean;
  connected: boolean;
  impactsPrice: boolean;
};

export type PricingVariableRow = {
  id: string;
  articleId: string;
  articleLabel: string;
  blockLabel: string;
  fieldKey: string;
  label: string;
  impactsPrice: boolean;
  isInformational: boolean;
  impactsStock: boolean;
  impactsProduction: boolean;
  visiblePos: boolean;
  active: boolean;
  priceModifier: number | null;
  source: string;
};

export type PricingDiffRow = {
  element: string;
  draftValue: string;
  publishedValue: string;
  differs: boolean;
  impact: 'critical' | 'warning' | 'info';
  action: string;
};

export type PricingArticleDetailPayload = {
  article: PricingArticleSummary;
  summary: {
    calculationType: string;
    saleUnit: string;
    qtyMin: number | null;
    prixBase: number | null;
    prixM2: number | null;
    formulaLabel: string | null;
    formulaVersion: number | null;
    formulaStatus: string;
    formulaExpression: string | null;
    lastUpdated: string | null;
    isPublished: boolean;
    unpublishedChanges: boolean;
  };
  variables: PricingVariableRow[];
  variableMatrix: PricingVariableMatrixRow[];
  businessRules: PricingBusinessRuleRow[];
  diffPos: PricingDiffRow[];
  recommendedSections: ArticlePricingSectionId[];
};
