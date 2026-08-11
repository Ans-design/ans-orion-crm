/**
 * Matières & grammages impression petit format — dérivés de OFFICIAL_MATERIAL_COMPAT.
 */
import { OFFICIAL_MATERIAL_COMPAT, type OfficialMaterialCompat } from './material-compat-official';
import {
  CARTE_COVER_WEIGHTS,
  CARTE_VISITE_MATIERES,
} from './carte-cover-material-catalog';

const CUSTOM_GRAMMAGE = 'Grammage personnalisé';

function withCustom(grammages: string[]): string[] {
  const base = grammages.filter((g) => g !== CUSTOM_GRAMMAGE);
  return [...base, CUSTOM_GRAMMAGE];
}

export function officialWeightsByLabels(
  labels: string[],
  extra: Record<string, string[]> = {},
): Record<string, string[]> {
  const byLabel = Object.fromEntries(
    OFFICIAL_MATERIAL_COMPAT.map((m) => [m.label, withCustom(m.grammages)]),
  ) as Record<string, string[]>;
  const out: Record<string, string[]> = { ...byLabel, ...extra };
  for (const label of labels) {
    if (!out[label]) out[label] = [CUSTOM_GRAMMAGE];
  }
  return out;
}

export function officialMatieresForFamily(
  family: OfficialMaterialCompat['family'],
  exclude: string[] = [],
): string[] {
  return OFFICIAL_MATERIAL_COMPAT.filter(
    (m) => m.family === family && !exclude.includes(m.label),
  ).map((m) => m.label);
}

/** Matières configurateur print (flyers, affiches…) */
export const PRINT_PETIT_FORMAT_MATIERES = [
  ...officialMatieresForFamily('Petit format', ['PCB pelliculé', 'Papier cover luxe']),
  'Matière personnalisée',
];

export const PRINT_WEIGHTS_BY_MATIERE: Record<string, string[]> = officialWeightsByLabels(
  PRINT_PETIT_FORMAT_MATIERES,
  { 'Matière personnalisée': [CUSTOM_GRAMMAGE] },
);

export const CARTE_WEIGHTS_BY_MATIERE: Record<string, string[]> = {
  ...CARTE_COVER_WEIGHTS,
  ...officialWeightsByLabels(
    [...CARTE_VISITE_MATIERES],
    CARTE_COVER_WEIGHTS,
  ),
};
