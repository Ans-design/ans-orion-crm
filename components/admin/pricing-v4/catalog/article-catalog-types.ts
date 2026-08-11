import type { ArticleFamilyFilterId } from '@/lib/pricing/pricing-admin-ui';

export type ArticleProfileRow = {
  articleId: string;
  articleLabel: string;
  family: string;
  calculationType: string;
  status: string;
  prixBase: number | null;
  qtyMin: number | null;
  saleUnit?: string | null;
  updatedAt: string;
  discountTiers?: {
    unitPrice: number | null;
    discountPercent: number;
    active?: boolean;
  }[];
  formulaVersions?: { version: number; status: string }[];
  optionGroups?: { visiblePos: boolean; label: string }[];
  _count?: {
    materialPrices: number;
    optionGroups: number;
    stockRules: number;
    formulaVersions: number;
  };
};

export type EnrichedArticleRow = ArticleProfileRow & {
  icon: string;
  category: string;
  categoryLabel: string;
  configType: string;
  hasPublishedFormula: boolean;
  formulaLabel: string;
  posVisible: boolean;
  warnings: ArticleWarning[];
  searchBlob: string;
};

export type ArticleWarning = {
  id: string;
  label: string;
  severity: 'warn' | 'danger';
};

export type CatalogCounters = {
  total: number;
  filtered: number;
  active: number;
  draft: number;
  noFormula: number;
  /** Articles avec formule publiée (compteur toolbar Studio Prix). */
  formulas?: number;
};

export type CatalogPageProps = {
  canEdit: boolean;
  initialArticleId?: string | null;
};

export type { ArticleFamilyFilterId };
