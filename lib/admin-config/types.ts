import type { MockupKind } from '@/lib/data/article-mockup-registry';

/** Modes de visibilité unifiés — articles, chips, catégories */
export type VisibilityMode =
  | 'ACTIVE'
  | 'DISABLED_VISIBLE'
  | 'HIDDEN'
  | 'ADMIN_ONLY'
  | 'SCHEDULED';

export type ArticleAdminEntry = {
  id: string;
  name: string;
  category: string;
  visibility: VisibilityMode;
  scheduledAt?: string | null;
};

export type ChipAdminEntry = {
  id: string;
  scope: 'article' | 'global';
  productId: string;
  blockKey: string;
  fieldKey: string;
  optionKey: string;
  label: string;
  description?: string;
  icon?: string;
  color?: string;
  order: number;
  visibility: VisibilityMode;
  priceImpact: number;
  affectsStock: boolean;
  affectsProduction: boolean;
  affectsDelay: boolean;
  required: boolean;
  defaultSelected: boolean;
  rolesVisible: string[];
  compatibleWith: string[];
  incompatibleWith: string[];
  source: 'catalogue' | 'admin';
  /** Option archivée — conservée en config, masquée au POS */
  archived?: boolean;
};

/** Groupe d’options produit (chips/select) — schéma admin unifié */
export type ProductOptionGroup = {
  productId: string;
  fieldKey: string;
  blockKey: string;
  label: string;
  type: 'chips' | 'chips_multi' | 'select';
  options: ChipAdminEntry[];
  archived?: boolean;
};

export type FeatureFlagEntry = {
  key: string;
  label: string;
  description?: string;
  enabled: boolean;
  rolesAllowed: string[];
  scope?: string;
  scopeId?: string;
};

export type VariableAdminEntry = {
  key: string;
  label: string;
  value: number | string;
  unit?: string;
  category: 'pricing' | 'margin' | 'delivery' | 'production' | 'general';
};

export type AdminConfigMeta = {
  draftVersion: number;
  publishedVersion: number;
  lastPublishedAt: string | null;
  lastPublishedBy: string | null;
};


export type ProductPreviewAdminEntry = {
  articleId: string;
  assetPath?: string | null;
  previewType?: MockupKind;
  previewLabel?: string;
  categoryFallbackAsset?: string | null;
  isActive?: boolean;
  order?: number;
};

export type AdminConfigSnapshot = {
  version: number;
  status: 'draft' | 'published';
  updatedAt: string;
  articles: Record<string, ArticleAdminEntry>;
  chips: Record<string, ChipAdminEntry>;
  featureFlags: Record<string, FeatureFlagEntry>;
  variables: Record<string, VariableAdminEntry>;
  /** Overrides aperçus produits POS — pilotage sans code */
  productPreviews?: Record<string, ProductPreviewAdminEntry>;
};

export type ConfigChangeSummary = {
  articlesChanged: number;
  chipsChanged: number;
  variablesChanged: number;
  featuresChanged: number;
  articlesDisabled: number;
  chipsModified: number;
  priceChanges: number;
  details: string[];
};

export type EffectiveArticleState = {
  visibility: VisibilityMode;
  selectable: boolean;
  greyed: boolean;
};

export type EffectivePosConfig = {
  meta: AdminConfigMeta;
  articles: Record<string, EffectiveArticleState>;
  featureFlags: Record<string, boolean>;
  productPreviews: Record<string, ProductPreviewAdminEntry>;
  variables: Record<string, number | string>;
  role: string;
};
