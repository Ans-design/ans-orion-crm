/** Catégories où la matière ne provient jamais du catalogue papier imprimerie. */
export const NON_PRINT_MATERIAL_CATEGORIES = new Set([
  'plv',
  'textile',
  'goodies',
  'grand_format',
  'photo',
  'conception',
  'notes',
  'calendrier',
  'evenementiel',
  'packaging',
]);

/** Préfixes d'articles hors papier imprimerie. */
export const NON_PRINT_MATERIAL_PREFIXES = [
  'plv-',
  'tx-',
  'gd-',
  'gf-',
  'ph-',
  'cg-',
  'bn-',
  'cal-',
  'plv',
] as const;

/** Catégories autorisées à recevoir le catalogue matière papier fusion (POS). */
export const PRINT_PAPER_MATERIAL_CATEGORIES = new Set([
  'flyers',
  'livres',
  'carterie',
  'document',
  'impression',
  'finitions',
]);

/** Articles avec matière figée dans config-types (calendriers, bloc-note, affiches evt…). */
export const FIXED_MATIERE_ARTICLE_IDS = new Set([
  'evt-affiche',
  'cal-mural',
  'cal-chevalet',
  'cal-chevalet-table',
  'cal-sousmain',
  'cal-marquepage',
  'cal-plateau',
  'cal-sousmain',
  'bn-bloc-note',
  'plv-chevalet',
  'plv-rollup',
  'plv-xbanner',
  'plv-presentoir-sol',
  'plv-porte-flyers',
  'plv-porte-affiches',
  'plv-presentoir-magasin',
  'plv-oriflamme',
  'cv-std',
  'cv-fidelite',
  'cv-jeux',
  'fly-std',
  'imp-impression',
  'imp-offset',
  'imp-pcb',
  'imp-autocollant',
  'imp-nb80',
  'imp-quadri',
  'imp-laser',
  'imp-sublimation',
  'imp-pvc',
]);

export function usesNonPrintMaterials(articleId: string, category?: string): boolean {
  if (FIXED_MATIERE_ARTICLE_IDS.has(articleId)) return true;
  if (category && NON_PRINT_MATERIAL_CATEGORIES.has(category)) return true;
  return NON_PRINT_MATERIAL_PREFIXES.some((p) => articleId.startsWith(p));
}

/**
 * Injecter le catalogue papier fusion uniquement pour l'impression (flyers, livres…).
 * PLV, textile, goodies, etc. gardent leurs matières métier dans config-types.
 */
export function shouldInjectPrintMaterialCatalog(
  articleId: string,
  category: string | undefined,
): boolean {
  if (usesNonPrintMaterials(articleId, category)) return false;
  return PRINT_PAPER_MATERIAL_CATEGORIES.has(category ?? '');
}
