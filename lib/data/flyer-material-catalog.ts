/**
 * Matières & grammages flyers — papier léger uniquement (≤ 300 g).
 * Sources : base ok.html (EVE_MAT_GRAMMAGES, stock GL120/GL160, photobook mats_gram),
 * consignes fusion métier — PCB/PCM ≠ Glossy.
 */

const CUSTOM = 'Grammage personnalisé';

/** Grammage maximum flyer (support fin, pas carte rigide). */
export const FLYER_MAX_GRAMMAGE_G = 300;

export const FLYER_MATIERES = [
  'PCB',
  'PCM',
  'Offset',
  'Glossy',
  'Bristol',
  'Papier recyclé',
  'Matière personnalisée',
] as const;

/** PCB / PCM — couché laser (90–300 g). base ok.html EVE_MAT_GRAMMAGES + stock PCB90… */
export const FLYER_PCB_PCM_WEIGHTS = [
  '90g',
  '115g',
  '130g',
  '135g',
  '150g',
  '170g',
  '250g',
  '300g',
  CUSTOM,
] as const;

/** Glossy — jet d'encre / photo (120–300 g, échelle distincte du PCB). */
export const FLYER_GLOSSY_WEIGHTS = [
  '120g',
  '140g',
  '160g',
  '180g',
  '250g',
  '300g',
  CUSTOM,
] as const;

/** Offset flyer — plafond 120 g (officiel petit format). */
const FLYER_OFFSET_WEIGHTS = ['70g', '80g', '90g', '100g', '120g', CUSTOM] as const;

/** Grammages flyer — aucune option au-dessus de 300 g. */
export const FLYER_WEIGHTS_BY_MATIERE: Record<string, string[]> = {
  PCB: [...FLYER_PCB_PCM_WEIGHTS],
  PCM: [...FLYER_PCB_PCM_WEIGHTS],
  Glossy: [...FLYER_GLOSSY_WEIGHTS],
  Bristol: ['170g', '250g', '300g', CUSTOM],
  Offset: [...FLYER_OFFSET_WEIGHTS],
  'Papier recyclé': ['115g', '130g', '135g', CUSTOM],
  'Matière personnalisée': [CUSTOM],
};

/** Plis / volets — dépliants, flyers A4 3 volets, etc. */
export const FLYER_VOLET_OPTIONS = [
  '1 volet (feuille plate)',
  '2 volets (1 pli)',
  '3 volets (2 plis)',
  '4 volets (3 plis)',
  '5 volets',
  '6 volets',
  'Personnalisé',
] as const;

/** Matières interdites sur flyers (carton rigide, PVC carte, supports épais…). */
export const FLYER_FORBIDDEN_MATIERE_PATTERNS = [
  /pvc/i,
  /carton rigide/i,
  /pellicul/i,
  /invitation/i,
  /textur/i,
  /toile fin/i,
  /cover luxe/i,
  /kraft/i,
] as const;

export function isFlyerForbiddenMatiereLabel(matiere: string): boolean {
  const m = matiere.trim();
  if (!m) return false;
  return FLYER_FORBIDDEN_MATIERE_PATTERNS.some((re) => re.test(m));
}
