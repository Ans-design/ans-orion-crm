/** @deprecated Orphelin — remplacé par publication-core / livres-pricing (ISF). Ne pas supprimer sans confirmation. */
export const LIVRES_COMMERCIAL_MARGIN = 1.35;
export const LIVRES_MIN_PRODUCTION_QTY = 1;
export const LIVRES_CHUTE_MM = 100;
export const LIVRES_PRINT_NB_PER_PAGE_AR = 45;
export const LIVRES_PRINT_QUADRI_PER_PAGE_AR = 120;
export const LIVRES_COVER_PRINT_AR = 250;
export const LIVRES_FINISHING_AR = 80;

export function livresMaterialRatePerM2Ar(grammageG: number): number {
  if (grammageG >= 250) return 2800;
  if (grammageG >= 170) return 2200;
  if (grammageG >= 115) return 1800;
  return 1400;
}

export function livresVolumeRemiseRate(qty: number): number {
  if (qty >= 1000) return 0.12;
  if (qty >= 500) return 0.1;
  if (qty >= 250) return 0.08;
  if (qty >= 100) return 0.05;
  if (qty >= 50) return 0.03;
  return 0;
}
