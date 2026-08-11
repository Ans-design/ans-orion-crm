/**
 * Laizes fallback Grand Format (cm) — source métier quand le stock est vide.
 * Utilisé par l’API POS, le calcul surface/prix et l’admin.
 */

import { laizeCmToChipLabel } from '@/lib/grand-format/laize-utils';

const PLAQUE_LAIZES_CM = [120, 240] as const;

/** Laizes par article (cm), triées croissantes à l’export. */
export const GF_LAIZE_FALLBACKS_CM: Record<string, readonly number[]> = {
  'gf-vinyl-blanc': [100, 150],
  'gf-vinyl-transp': [150],
  'gf-oneway': [120],
  'gf-reflechissant': [100, 120, 150],
  'gf-frosted': [120],
  'gf-dosbleu': [120, 150],
  'gf-bache': [100, 140, 160, 180, 240, 320],
  'gf-bache440': [140, 160, 180, 240],
  'gf-mesh': [160],
  'gf-bache320': [240, 320],
  'gf-tissu': [150, 160],
  'gf-photo': [100],
  'gf-pp': [90, 100],
  'gf-toile': [100, 150],
  'gf-acrylic': PLAQUE_LAIZES_CM,
  'gf-pvc': PLAQUE_LAIZES_CM,
  'gf-pvc3': PLAQUE_LAIZES_CM,
  'gf-pvc6': PLAQUE_LAIZES_CM,
  'gf-plexi': PLAQUE_LAIZES_CM,
  'gf-plexi3': PLAQUE_LAIZES_CM,
  'gf-plexi5': PLAQUE_LAIZES_CM,
};

export function sortLaizesCm(laizes: number[]): number[] {
  return [...new Set(laizes.filter((l) => Number.isFinite(l) && l > 0))].sort((a, b) => a - b);
}

export function gfLaizeFallbackCm(articleId: string): number[] {
  return sortLaizesCm([...(GF_LAIZE_FALLBACKS_CM[articleId] ?? [])]);
}

export function gfLaizeFallbackLabels(articleId: string): string[] {
  return gfLaizeFallbackCm(articleId).map(laizeCmToChipLabel);
}
