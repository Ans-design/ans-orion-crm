/**
 * Fiche produit unifiée — Prix & règles (Ultra-Prompt).
 * Onglets métier uniquement : pas de POS, pas de publication Brouillon/Publié.
 * Matières = sélection lecture seule dans Formule & composition (liens vers le domaine Matières).
 */

import type { ArticlePricingSectionId } from '@/lib/pricing/pricing-admin-ui';

export type ProductSheetTabId =
  | 'general'
  | 'tarification'
  | 'formule-composition'
  | 'options-finitions'
  | 'simulation'
  | 'historique'
  // Alias legacy (deep-links) — résolus vers les onglets ci-dessus
  | 'prix'
  | 'apercu'
  | 'matieres-formats'
  | 'apparence-pos';

export type ProductSheetTab = {
  id: ProductSheetTabId;
  label: string;
  short: string;
  sectionIds: readonly ArticlePricingSectionId[];
  defaultSectionId: ArticlePricingSectionId;
  /** Masqué de la nav fiche (alias). */
  hidden?: boolean;
};

/** Onglets visibles — parcours administrateur Prix & règles. */
export const PRODUCT_SHEET_TABS: readonly ProductSheetTab[] = [
  {
    id: 'general',
    label: 'Général',
    short: 'Général',
    sectionIds: ['infos', 'statut'],
    defaultSectionId: 'infos',
  },
  {
    id: 'tarification',
    label: 'Tarification',
    short: 'Tarif',
    sectionIds: ['paliers', 'urgence'],
    defaultSectionId: 'paliers',
  },
  {
    id: 'formule-composition',
    label: 'Formule & composition',
    short: 'Formule',
    sectionIds: ['formule', 'variables', 'matieres'],
    defaultSectionId: 'formule',
  },
  {
    id: 'options-finitions',
    label: 'Options & finitions',
    short: 'Options',
    sectionIds: ['options', 'regles'],
    defaultSectionId: 'options',
    /** Gestion détaillée = domaine Options & finitions — résumé uniquement dans Général */
    hidden: true,
  },
  {
    id: 'simulation',
    label: 'Simulation',
    short: 'Simu',
    /** Legacy deep-link → Formule (onglet Simulateur retiré de la nav). */
    sectionIds: ['formule', 'anomalies'],
    defaultSectionId: 'formule',
    hidden: true,
  },
  {
    id: 'historique',
    label: 'Historique',
    short: 'Historique',
    /** Legacy deep-link → Anomalies (Versions UI retirée de la fiche). */
    sectionIds: ['anomalies'],
    defaultSectionId: 'anomalies',
    hidden: true,
  },
  // Aliases conservés pour deep-links (zéro suppression routes)
  {
    id: 'prix',
    label: 'Tarification',
    short: 'Prix',
    sectionIds: ['paliers', 'urgence'],
    defaultSectionId: 'paliers',
    hidden: true,
  },
  {
    id: 'apercu',
    label: 'Simulation',
    short: 'Aperçu',
    sectionIds: ['formule', 'anomalies'],
    defaultSectionId: 'formule',
    hidden: true,
  },
  {
    id: 'matieres-formats',
    label: 'Formule & composition',
    short: 'Matières',
    sectionIds: ['formule', 'matieres'],
    defaultSectionId: 'formule',
    hidden: true,
  },
  {
    id: 'apparence-pos',
    label: 'Général',
    short: 'Général',
    sectionIds: ['infos', 'statut'],
    defaultSectionId: 'statut',
    hidden: true,
  },
] as const;

export const PRODUCT_SHEET_TABS_VISIBLE = PRODUCT_SHEET_TABS.filter((t) => !t.hidden);

/** Anciens ids d’onglets catalogue → onglet fiche produit. */
export const LEGACY_CONFIG_TAB_TO_SHEET: Record<string, ProductSheetTabId> = {
  infos: 'general',
  options: 'options-finitions',
  matieres: 'formule-composition',
  formats: 'formule-composition',
  'matieres-formats': 'formule-composition',
  prix: 'tarification',
  formules: 'formule-composition',
  stock: 'general',
  regles: 'options-finitions',
  historique: 'historique',
  sim: 'simulation',
  anomalies: 'simulation',
  'apparence-pos': 'general',
  apercu: 'simulation',
  tarification: 'tarification',
  'formule-composition': 'formule-composition',
  simulation: 'simulation',
};

export function resolveProductSheetTab(raw: string | null | undefined): ProductSheetTabId {
  if (!raw) return 'general';
  let resolved: ProductSheetTabId;
  if (PRODUCT_SHEET_TABS.some((t) => t.id === raw)) {
    resolved = raw as ProductSheetTabId;
  } else {
    resolved = LEGACY_CONFIG_TAB_TO_SHEET[raw] ?? 'general';
  }

  const tab = PRODUCT_SHEET_TABS.find((t) => t.id === resolved);
  if (!tab?.hidden) return resolved;

  // Alias / modules dédiés → onglets visibles de la fiche produit
  if (resolved === 'options-finitions') return 'general';
  if (resolved === 'simulation' || resolved === 'apercu') return 'tarification';
  if (resolved === 'historique') return 'formule-composition';
  if (resolved === 'prix') return 'tarification';
  if (resolved === 'matieres-formats') return 'formule-composition';
  if (resolved === 'apparence-pos') return 'general';
  return 'general';
}

export function productSheetTabForSection(sectionId: ArticlePricingSectionId): ProductSheetTabId {
  const hit = PRODUCT_SHEET_TABS_VISIBLE.find((t) => t.sectionIds.includes(sectionId));
  return hit?.id ?? 'general';
}

export type PublishCheckSeverity = 'blocking' | 'important' | 'warning' | 'info';

export type PublishCheckItem = {
  id: string;
  severity: PublishCheckSeverity;
  label: string;
  field: string;
  tabId: ProductSheetTabId;
  suggestion: string;
};

export type PublishChecklistInput = {
  articleId?: string | null;
  articleLabel?: string | null;
  family?: string | null;
  status?: string | null;
  isPublished?: boolean;
  prixBase?: number | null;
  prixM2?: number | null;
  hasFormula?: boolean;
  formulaPublished?: boolean;
  optionGroupCount?: number;
  visiblePosOptionCount?: number;
  materialCount?: number;
  tierCount?: number;
  overlappingTiers?: boolean;
  negativeTierPrice?: boolean;
  anomalyCount?: number;
  hasMockup?: boolean;
};

export type PublishChecklistResult = {
  canPublish: boolean;
  items: PublishCheckItem[];
  blockingCount: number;
  importantCount: number;
};

/** Checklist validation tarifaire — alertes calculées (pas un statut Brouillon). */
export function buildPublishChecklist(input: PublishChecklistInput): PublishChecklistResult {
  const items: PublishCheckItem[] = [];

  if (!input.articleLabel?.trim()) {
    items.push({
      id: 'name',
      severity: 'blocking',
      label: 'Nom du produit manquant',
      field: 'articleLabel',
      tabId: 'general',
      suggestion: 'Renseigner le libellé commercial.',
    });
  }
  if (!input.articleId?.trim()) {
    items.push({
      id: 'ref',
      severity: 'blocking',
      label: 'Référence manquante',
      field: 'articleId',
      tabId: 'general',
      suggestion: 'Attribuer une référence unique.',
    });
  }
  if (!input.family?.trim()) {
    items.push({
      id: 'family',
      severity: 'blocking',
      label: 'Catégorie absente',
      field: 'family',
      tabId: 'general',
      suggestion: 'Choisir une catégorie.',
    });
  }

  const hasPrice =
    (input.prixBase != null && input.prixBase > 0)
    || (input.prixM2 != null && input.prixM2 > 0)
    || (input.tierCount ?? 0) > 0
    || Boolean(input.hasFormula);
  if (!hasPrice) {
    items.push({
      id: 'price',
      severity: 'blocking',
      label: 'Prix fixe manquant',
      field: 'prixBase',
      tabId: 'tarification',
      suggestion: 'Définir un prix fixe, des paliers ou une formule.',
    });
  }

  if (!input.hasFormula && (input.tierCount ?? 0) === 0 && (input.prixBase == null || input.prixBase <= 0)) {
    items.push({
      id: 'formula',
      severity: 'important',
      label: 'Formule manquante',
      field: 'formula',
      tabId: 'formule-composition',
      suggestion: 'Configurer une formule ou un prix fixe.',
    });
  } else if (input.hasFormula && !input.formulaPublished && !input.isPublished) {
    items.push({
      id: 'formula-draft',
      severity: 'warning',
      label: 'Formule incomplète',
      field: 'formula.status',
      tabId: 'formule-composition',
      suggestion: 'Compléter la formule active (version tarifaire).',
    });
  }

  if ((input.optionGroupCount ?? 0) === 0) {
    items.push({
      id: 'options',
      severity: 'info',
      label: 'Aucune option / finition',
      field: 'optionGroups',
      tabId: 'options-finitions',
      suggestion: 'Ajouter des options tarifaires si le produit le nécessite.',
    });
  }

  if ((input.materialCount ?? 0) === 0 && input.hasFormula) {
    items.push({
      id: 'materials',
      severity: 'warning',
      label: 'Matière absente',
      field: 'materialPrices',
      tabId: 'formule-composition',
      suggestion: 'Sélectionner une matière du référentiel (lecture seule).',
    });
  }

  if (input.overlappingTiers) {
    items.push({
      id: 'tiers-overlap',
      severity: 'blocking',
      label: 'Règle invalide — paliers qui se chevauchent',
      field: 'discountTiers',
      tabId: 'tarification',
      suggestion: 'Corriger les bornes min/max des paliers.',
    });
  }
  if (input.negativeTierPrice) {
    items.push({
      id: 'tiers-neg',
      severity: 'blocking',
      label: 'Règle invalide — prix de palier négatif',
      field: 'discountTiers.unitPrice',
      tabId: 'tarification',
      suggestion: 'Corriger les montants ≥ 0.',
    });
  }

  if ((input.anomalyCount ?? 0) > 0) {
    items.push({
      id: 'anomalies',
      severity: 'important',
      label: `${input.anomalyCount} anomalie(s) tarifaire(s)`,
      field: 'anomalies',
      tabId: 'simulation',
      suggestion: 'Consulter la simulation / alertes.',
    });
  }

  const blockingCount = items.filter((i) => i.severity === 'blocking').length;
  const importantCount = items.filter((i) => i.severity === 'important').length;

  return {
    canPublish: blockingCount === 0,
    items,
    blockingCount,
    importantCount,
  };
}

/** Détecte chevauchements et prix négatifs sur paliers. */
export function analyzeTiers(
  tiers: Array<{ minQty: number; maxQty: number | null; unitPrice: number | null; active?: boolean }>,
): { overlapping: boolean; negativePrice: boolean } {
  const active = tiers.filter((t) => t.active !== false);
  let overlapping = false;
  let negativePrice = false;
  for (const t of active) {
    if (t.unitPrice != null && t.unitPrice < 0) negativePrice = true;
    if (t.maxQty != null && t.minQty > t.maxQty) overlapping = true;
  }
  const sorted = [...active].sort((a, b) => a.minQty - b.minQty);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const cur = sorted[i]!;
    const prevMax = prev.maxQty ?? Number.POSITIVE_INFINITY;
    if (cur.minQty <= prevMax) overlapping = true;
  }
  return { overlapping, negativePrice };
}
