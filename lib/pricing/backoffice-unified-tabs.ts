import type { ArticlePricingSectionId } from '@/lib/pricing/pricing-admin-ui';

/** 6 onglets unifiés — Backoffice Catalogue & Tarification */
export const BACKOFFICE_UNIFIED_TABS = [
  { id: 'general', label: 'Général', icon: 'info' },
  { id: 'variables', label: 'Variables & Options', icon: 'sliders' },
  { id: 'pricing', label: 'Prix & Formules', icon: 'tag' },
  { id: 'stock', label: 'Stock & Contraintes', icon: 'package' },
  { id: 'sync', label: 'Synchronisation POS', icon: 'refresh' },
  { id: 'history', label: 'Historique & Anomalies', icon: 'history' },
] as const;

export type BackofficeUnifiedTabId = (typeof BACKOFFICE_UNIFIED_TABS)[number]['id'];

/** Section par défaut dans ArticlePricingCard pour chaque onglet unifié */
export const UNIFIED_TAB_DEFAULT_SECTION: Record<BackofficeUnifiedTabId, ArticlePricingSectionId> = {
  general: 'infos',
  variables: 'options',
  pricing: 'paliers',
  stock: 'statut',
  /** Sync POS : section Formule (Versions UI retirée des sections article). */
  sync: 'formule',
  history: 'anomalies',
};

/** Sous-sections affichées dans l’onglet Prix & Formules */
export const PRICING_SUB_SECTIONS: { id: ArticlePricingSectionId; label: string }[] = [
  { id: 'matieres', label: 'Matières' },
  { id: 'formule', label: 'Formule' },
  { id: 'paliers', label: 'Paliers' },
  { id: 'urgence', label: 'Urgence' },
];

/** Sous-sections Variables & Options */
export const VARIABLES_SUB_SECTIONS: { id: ArticlePricingSectionId; label: string }[] = [
  { id: 'options', label: 'Options / Chips' },
  { id: 'variables', label: 'Variables' },
];
