/** UI Admin Tarification Dynamique — aligné maquettes ORION */

import type { LucideIcon } from 'lucide-react';
import {
  Activity, Boxes, Package, Calculator, SlidersHorizontal, History,
  UserPlus, AlertTriangle, ImageIcon,
} from 'lucide-react';

export const PRICING_ADMIN_TOP_TABS = [
  { id: 'sante', label: 'Santé', icon: Activity },
  { id: 'articles', label: 'Articles', icon: Boxes },
  { id: 'apercus', label: 'Aperçus POS', icon: ImageIcon },
  { id: 'chips', label: 'Chips', icon: Package },
  { id: 'matieres', label: 'Matières DB', icon: Package },
  { id: 'variables', label: 'Variables', icon: SlidersHorizontal },
  { id: 'fonctions', label: 'Fonctions POS', icon: SlidersHorizontal },
  { id: 'versions', label: 'Versions', icon: History },
  { id: 'acces', label: 'Accès', icon: UserPlus },
  { id: 'anomalies', label: 'Anomalies', icon: AlertTriangle, badge: true },
  /** Archive lecture seule — jamais source de vérité POS. */
  { id: 'prix2026', label: 'PRIX 2026 (archive)', icon: Calculator },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: boolean;
}>;

export const SECTION_NUMBERS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫'] as const;

export type PricingAdminTopTabId = (typeof PRICING_ADMIN_TOP_TABS)[number]['id'];

export const ARTICLE_PRICING_SECTIONS = [
  { id: 'infos', num: 1, label: 'Infos' },
  { id: 'statut', num: 2, label: 'Disponibilité' },
  { id: 'options', num: 3, label: 'Finitions' },
  { id: 'matieres', num: 4, label: 'Matières' },
  { id: 'variables', num: 5, label: 'Variables' },
  { id: 'formule', num: 6, label: 'Formule' },
  { id: 'paliers', num: 7, label: 'Paliers' },
  { id: 'urgence', num: 8, label: 'Urgence' },
  { id: 'regles', num: 9, label: 'Règles métier' },
  { id: 'anomalies', num: 10, label: 'Anomalies' },
] as const;

export type ArticlePricingSectionId = (typeof ARTICLE_PRICING_SECTIONS)[number]['id'];

/** Deep-links legacy Simulateur / Versions → Formule (UI retirée). */
export function resolveArticlePricingSection(
  raw: string | null | undefined,
): ArticlePricingSectionId {
  const id = String(raw ?? '').toLowerCase();
  if (id === 'sim' || id === 'simulateur' || id === 'simulation' || id === 'versions' || id === 'version') {
    return 'formule';
  }
  if (ARTICLE_PRICING_SECTIONS.some((s) => s.id === id)) {
    return id as ArticlePricingSectionId;
  }
  return 'infos';
}

/**
 * Onglets panneau détail catalogue — fiche produit (3 visibles).
 * Options / Simulation / Historique : modules dédiés (zéro duplication UX).
 */
export const ARTICLE_CONFIG_TABS = [
  { id: 'general', label: 'Général', sectionId: 'infos' },
  { id: 'tarification', label: 'Tarification', sectionId: 'paliers' },
  { id: 'formule-composition', label: 'Formule & composition', sectionId: 'formule' },
] as const;

export type ArticleConfigTabId = (typeof ARTICLE_CONFIG_TABS)[number]['id'];

export const ARTICLE_FAMILY_FILTERS = [
  { id: 'all', label: 'Tous' },
  { id: 'active', label: 'Actifs' },
  { id: 'archived', label: 'Archivés' },
  { id: 'invalid', label: 'À corriger' },
  { id: 'no-formula', label: 'Sans formule' },
  { id: 'grand_format', label: 'Grand format' },
  { id: 'imprimerie', label: 'Imprimerie' },
  { id: 'textile', label: 'Textile' },
  { id: 'goodies', label: 'Goodies' },
  { id: 'evenementiel', label: 'Événementiel' },
] as const;

export type ArticleFamilyFilterId = (typeof ARTICLE_FAMILY_FILTERS)[number]['id'];

export type CatalogViewMode = 'chips' | 'list';

export const CATALOG_VIEW_STORAGE_KEY = 'pta-catalog-view';
export const CATALOG_LAST_ARTICLE_KEY = 'pta-last-article';

/** Rétro-compat URLs */
export const PRICING_TAB_TO_ADMIN: Record<string, PricingAdminTopTabId> = {
  engine: 'articles',
  overview: 'articles',
  migration: 'prix2026',
  settings: 'matieres',
  anomalies: 'anomalies',
  articles: 'articles',
  chips: 'chips',
  matieres: 'matieres',
  prix2026: 'prix2026',
  variables: 'variables',
  fonctions: 'fonctions',
  versions: 'versions',
  acces: 'acces',
  tarification: 'articles',
  simulator: 'articles',
  materials: 'matieres',
  features: 'fonctions',
  'legacy-tarifs': 'prix2026',
  audit: 'anomalies',
  sante: 'sante',
  apercus: 'apercus',
  hub: 'sante',
};

export function resolvePricingAdminTab(raw: string | null): PricingAdminTopTabId {
  if (!raw) return 'sante';
  if (PRICING_ADMIN_TOP_TABS.some((t) => t.id === raw)) return raw as PricingAdminTopTabId;
  return PRICING_TAB_TO_ADMIN[raw] ?? 'articles';
}
