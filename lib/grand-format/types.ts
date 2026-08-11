export type GfStockKind = 'rouleau' | 'plaque';

export type GfLaizeStockEntry = {
  cm: number;
  label: string;
  stockItemId: string;
  sku: string;
  available: boolean;
  quantity: number;
};

export type GfPlateStockEntry = {
  label: string;
  largeurCm: number;
  hauteurCm: number;
  stockItemId: string;
  sku: string;
  available: boolean;
};

export type GfArticleStockProfile = {
  articleId: string;
  stockKind: GfStockKind;
  laizes: GfLaizeStockEntry[];
  plates: GfPlateStockEntry[];
  prixA0: number | null;
  prixM2Fallback: number | null;
  materialKeys: string[];
};

export type GrandFormatBillableResult = {
  clientLargeurCm: number;
  clientHauteurCm: number;
  petiteDimensionCm: number;
  grandeDimensionCm: number;
  laizeUtiliseeCm: number | null;
  laizeLabel: string | null;
  /** true si longueur ou largeur client = laize stock (±0,5 cm) — règle -30 cm ignorée. */
  laizeExactMatch: boolean;
  laizeRuleApplied: boolean;
  /** Largeur matière facturée (seule dimension pouvant être arrondie à la laize). */
  largeurFactureeCm: number;
  /** Longueur production facturée (dimension réelle client, jamais arrondie à la laize). */
  longueurFactureeCm: number;
  orientation: 'normal' | 'rotation' | 'assemblage' | null;
  assemblageRequired: boolean;
  strips: number;
  surfaceReelleM2: number;
  /** Matière réellement consommée sur rouleau (laize × longueur production). */
  surfaceLaizeM2: number;
  surfaceFactureeM2: number;
  pricingSurfaceMode: 'reelle' | 'laize' | 'intelligente';
  prixM2: number | null;
  prixUnitaire: number;
  calculable: boolean;
  surDevis: boolean;
  warning?: string;
  ruleMessage?: string;
  /** Marge découpe A0–A5 si appliquée. */
  margeDecoupePercent?: number;
  margeDecoupeAr?: number;
};
