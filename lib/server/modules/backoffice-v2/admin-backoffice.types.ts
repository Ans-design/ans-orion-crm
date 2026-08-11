export type AdminBackofficeTabId =
  | 'overview'
  | 'articles'
  | 'chips'
  | 'tiers'
  | 'pricing-custom'
  | 'materials'
  | 'prices2026'
  | 'variables'
  | 'pos-functions'
  | 'versions'
  | 'access'
  | 'anomalies'
  | 'sync'
  | 'audit';

/** 11 hubs navigation (regroupe les 14 onglets — zéro suppression) */
export type AdminBackofficeHubId =
  | 'overview'
  | 'articles'
  | 'chips'
  | 'materials'
  | 'tiers'
  | 'pricing'
  | 'stock'
  | 'versions'
  | 'access'
  | 'anomalies'
  | 'audit';

/** @deprecated Préférer ADMIN_BACKOFFICE_HUBS — conservé pour compat tests */
export const ADMIN_BACKOFFICE_TABS: { id: AdminBackofficeTabId; label: string }[] = [
  { id: 'overview', label: 'Vue globale' },
  { id: 'articles', label: 'Articles & prix' },
  { id: 'chips', label: 'Options / Chips' },
  { id: 'tiers', label: 'Paliers / Remises' },
  { id: 'pricing-custom', label: 'Prix & Calculs' },
  { id: 'materials', label: 'Matières de base' },
  { id: 'prices2026', label: 'PRIX 2026 (archive)' },
  { id: 'variables', label: 'Variables' },
  { id: 'pos-functions', label: 'Fonctions POS' },
  { id: 'versions', label: 'Versions' },
  { id: 'access', label: 'Accès' },
  { id: 'anomalies', label: 'Anomalies' },
  { id: 'sync', label: 'Synchronisation' },
  { id: 'audit', label: 'Audit Log' },
];

export type ArticlePriceTableRow = {
  articleId: string;
  articleLabel: string;
  icon: string;
  family: string;
  category: string;
  status: string;
  active: boolean;
  visiblePos: boolean;
  calculationType: string;
  saleUnit: string;
  prixBase: number | null;
  prixM2: number | null;
  qtyMin: number | null;
  tiersSummary: string;
  tiersCount: number;
  materialCount: number;
  pricingVariableCount: number;
  indicativeVariableCount: number;
  formulaStatus: 'published' | 'draft' | 'none';
  formulaVersion: number | null;
  prix2026Status: 'migrated' | 'not_migrated' | 'partial' | 'n/a';
  anomalyCritical: number;
  anomalyWarning: number;
  updatedAt: string;
  publicationStatus: 'synced' | 'draft' | 'archived';
};

import type { BackofficeSyncStatus } from '../backoffice/backoffice.types';

export type AdminBackofficeOverview = {
  articlesActive: number;
  articlesVisiblePos: number;
  formulasPublished: number;
  drafts: number;
  withoutFormula: number;
  anomaliesCritical: number;
  anomaliesWarning: number;
  prix2026NotMigrated: number;
  unpublishedChanges: number;
  lastPublishedAt: string | null;
  lastPublishedBy: string | null;
  catalogueTotal: number;
  engineVersion: string;
  /** Matières de base */
  materialsTotal: number;
  materialsPublished: number;
  materialsDraft: number;
  materialsMissingPrice: number;
  materialsLinkedStock: number;
  materialsWithAnomalies: number;
  /** Stock lié aux matières */
  stockCritical: number;
  stockRupture: number;
  /** Santé sync */
  syncStatus: BackofficeSyncStatus['status'];
  syncMessage: string;
};
