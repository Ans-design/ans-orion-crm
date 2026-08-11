import type { PricingAnomaly } from '@/lib/pricing/pricing-types';

export type BackofficeCatalogSummary = {
  families: { id: string; label: string; count: number }[];
  articles: {
    articleId: string;
    articleLabel: string;
    family: string;
    status: string;
    prixComplete: boolean;
    hasAnomaly: boolean;
    updatedAt: string;
  }[];
  total: number;
  publishedCount: number;
  draftCount: number;
  anomalyCount: number;
  lastUpdated: string | null;
};

export type BackofficeSyncStatus = {
  posUpToDate: boolean;
  pendingChanges: number;
  lastPublishedAt: string | null;
  lastPublishedBy: string | null;
  status: 'synced' | 'modified_unpublished' | 'pending' | 'error' | 'incomplete' | 'blocked';
  message: string;
};

export type BackofficeAuditEntry = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  entityLabel: string | null;
  userName: string | null;
  createdAt: string;
  module: string;
};

export type BackofficeAnomalyList = {
  items: PricingAnomaly[];
  critical: number;
  warning: number;
  info: number;
  checkedAt: string;
};
