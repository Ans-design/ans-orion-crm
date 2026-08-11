import { formatChipLabels, PELLICULAGE_FORMATS } from '@/lib/finition/finition-formats';

/** Filtre procédé pelliculage : Mat → à chaud uniquement. */
export function filterPelliculageProcedeOptions(
  matiereType: string,
  options: string[],
): string[] {
  if (matiereType === 'Mat') {
    return options.filter((o) => o === 'Pelliculage à chaud');
  }
  return options;
}

/** Labels dimension pelliculage avec personnalisé. */
export const PELLICULAGE_DIM_OPTIONS = [
  ...formatChipLabels(PELLICULAGE_FORMATS),
  'Personnalisé',
];

export function filterPoseAutocollantTypeOptions(options: string[]): string[] {
  return options.filter((o) => !/renforc/i.test(o));
}

export function isPoseGrandFormat(type: string): boolean {
  return /vinyle grand format|grand format/i.test(type);
}

export function isPosePetitFormat(type: string): boolean {
  return /petit format|simple/i.test(type) && !isPoseGrandFormat(type);
}

export function computeSurfaceM2(longueur: number, largeur: number, unite: 'm' | 'cm' = 'm'): number {
  const l = unite === 'cm' ? longueur / 100 : longueur;
  const w = unite === 'cm' ? largeur / 100 : largeur;
  const m2 = l * w;
  return Math.round(m2 * 100) / 100;
}
