export interface ConfigField {
  key: string;
  label: string;
  type: 'chips' | 'chips_multi' | 'number' | 'textarea' | 'color_palette' | 'dimensions' | 'size_qty_table' | 'corner_rounding' | 'bache_eyelets';
  options?: string[];
  default?: any;
  note?: string;
  suffix?: string;
  min?: number;
  max?: number;
  presets?: number[];
  // Conditional: show this field only when another field has a certain value
  showWhen?: { field: string; values: string[] };
  // Conditional sub-fields that appear when trigger value is selected
  conditionalField?: { trigger: string; fields: { key: string; placeholder: string; type: string }[] };
  // For color_palette: palette entries with hex + label
  palette?: { id: string; label: string; hex: string; badge?: string; look?: 'solid' | 'translucent' | 'metallic' | 'kraft' }[];
  // For color_palette: filter palette by another field value
  paletteFilter?: { field: string; palettes: Record<string, { id: string; label: string; hex: string; badge?: string; look?: 'solid' | 'translucent' | 'metallic' | 'kraft' }[]> };
  // For chips: filter options by another field value
  optionsFilter?: { field: string; optionsByValue: Record<string, string[]> };
  // Compatibility matrix: which options are available per material/field
  compatibility?: Record<string, string[]>;
  // Force price when this value is selected
  forcePriceValues?: string[];
  // Size-quantity table config
  sizeGroups?: { label: string; sizes: string[] }[];
  /** Mode de sélection POS — single par défaut pour chips, multiple pour chips_multi */
  selectionMode?: 'single' | 'multiple' | 'multipleExact' | 'multipleMinMax' | 'quantity' | 'text' | 'number' | 'conditional';
  minSelections?: number;
  maxSelections?: number;
  exactSelections?: number;
  required?: boolean;
  /** Saisie « Autres » — dimension, quantity, grammage, material, etc. */
  customInput?: 'dimension' | 'quantity' | 'grammage' | 'material' | 'finish' | 'technology' | 'color' | 'binding' | 'text';
  /** Sous-groupe visuel dans une section en grille (ex. Intérieur / Couverture) */
  group?: string;
  /** Masqué dans le POS actif — conservé pour admin / historique */
  posHidden?: boolean;
  archived?: boolean;
  keepForHistory?: boolean;
}

export interface ConfigSection {
  title: string;
  icon: string;
  fields: ConfigField[];
  /** Disposition compacte : grille 2 ou 3 colonnes au lieu d'une pile verticale */
  layout?: 'stack' | 'grid-2' | 'grid-3';
  // Show section only when condition met
  showWhen?: { field: string; values: string[] };
  /** Masqué dans le POS actif — conservé pour admin / historique */
  posHidden?: boolean;
  archived?: boolean;
  keepForHistory?: boolean;
}

export interface ProductConfig {
  sections: ConfigSection[];
  priceTiers?: { max: number | null; px: number }[];
  prixBase?: number;
  prixM2?: number; // Prix par m² (grand format)
  prixCm2?: number; // Prix par cm² (boîtes)
  qtyMin?: number;
  qtyDefault?: number;
  qtyPresets?: number[];
  aliases?: string[];
  hasCliche?: boolean;
  /** Bandeau informatif POS (panier, devis, production). */
  posBanner?: string;
  // Pricing mode flags
  requiresForcedPrice?: boolean;
}
