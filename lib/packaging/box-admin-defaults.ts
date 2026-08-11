/** Matières boîte — épaisseur (mm) et prix m² (Ar) pour cockpit admin / calcul poids. */
export type BoxMaterialAdminRow = {
  id: string;
  label: string;
  grammage: number;
  epaisseurMm: number;
  prixM2: number;
};

export const BOX_MATERIAL_ADMIN_DEFAULTS: BoxMaterialAdminRow[] = [
  { id: 'carton-250', label: 'Carton 250 g', grammage: 250, epaisseurMm: 0.45, prixM2: 8500 },
  { id: 'carton-300', label: 'Carton 300 g', grammage: 300, epaisseurMm: 0.55, prixM2: 9500 },
  { id: 'carton-350', label: 'Carton 350 g', grammage: 350, epaisseurMm: 0.65, prixM2: 10500 },
  { id: 'carton-400', label: 'Carton 400 g', grammage: 400, epaisseurMm: 0.75, prixM2: 11500 },
];

export const BOX_ADMIN_DEFAULTS = {
  marge_chute_mm: 50,
  bleed_mm: 3,
  patte_colle_mm: 15,
  surface_brute_extra_mm: 100,
} as const;

export function resolveBoxMaterialEpaisseurMm(matiereLabel: string | undefined): number {
  const label = String(matiereLabel ?? '').toLowerCase();
  const row = BOX_MATERIAL_ADMIN_DEFAULTS.find((r) => label.includes(String(r.grammage)));
  return row?.epaisseurMm ?? 0.45;
}

export function resolveBoxMaterialPrixM2(matiereLabel: string | undefined): number | null {
  const label = String(matiereLabel ?? '').toLowerCase();
  const row = BOX_MATERIAL_ADMIN_DEFAULTS.find((r) => label.includes(String(r.grammage)));
  return row?.prixM2 ?? null;
}
