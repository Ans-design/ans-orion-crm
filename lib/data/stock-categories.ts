/** Catégories stock — 4 types métier imprimerie */
export const STOCK_CATEGORIES = [
  { id: 'vente_directe', label: 'Vente directe', description: 'Articles revendus tels quels (fournitures, accessoires, puces vendables)' },
  { id: 'hybride', label: 'Hybride', description: 'Vente directe + support production (mugs, textiles, goodies vierges)' },
  { id: 'matiere_interne', label: 'Matière interne', description: 'Papier, vinyle, encre — production / POS' },
  { id: 'maintenance_piece', label: 'Maintenance / pièces machines', description: 'Puces, têtes, kits maintenance — machines & tickets' },
] as const;

export type StockCategoryId = (typeof STOCK_CATEGORIES)[number]['id'];

/** Alias legacy / ultraprompt */
export const STOCK_CATEGORY_ALIASES: Record<string, StockCategoryId> = {
  DIRECT_SALE: 'vente_directe',
  HYBRID: 'hybride',
  INTERNAL_MATERIAL: 'matiere_interne',
  MAINTENANCE_PART: 'maintenance_piece',
  'Utilisation interne': 'matiere_interne',
  'Vente Directe': 'vente_directe',
};

export function normalizeStockCategory(raw: string): StockCategoryId {
  const key = raw?.trim();
  if (STOCK_CATEGORY_ALIASES[key]) return STOCK_CATEGORY_ALIASES[key];
  const found = STOCK_CATEGORIES.find((c) => c.id === key);
  return found?.id ?? 'matiere_interne';
}
