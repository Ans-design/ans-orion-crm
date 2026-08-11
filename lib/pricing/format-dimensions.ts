import {
  parseGrandFormatDimensionsCm,
  surfaceM2FromCm,
} from '@/lib/dimensions/grand-format-units';

export type GrandFormatDimensions = {
  largeur: number;
  hauteur: number;
  m2: number;
};

/** Dimensions + surface m² grand format — source unique POS / stock / marge */
export function computeGrandFormatDimensions(
  config: Record<string, unknown>,
): GrandFormatDimensions | null {
  const parsed = parseGrandFormatDimensionsCm(config);
  if (!parsed) return null;
  const { longueurCm, largeurCm } = parsed;
  return {
    largeur: longueurCm,
    hauteur: largeurCm,
    m2: surfaceM2FromCm(longueurCm, largeurCm),
  };
}

export function computeGrandFormatM2(config: Record<string, unknown>): number | null {
  return computeGrandFormatDimensions(config)?.m2 ?? null;
}
