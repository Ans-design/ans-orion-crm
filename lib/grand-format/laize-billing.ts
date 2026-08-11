/**
 * Moteur unique laize Grand Format — bâche, vinyle, plaques, mesh, etc.
 *
 * Règle format personnalisé :
 * 1) Une des deux dimensions (L ou l) doit rentrer dans la laize ;
 * 2) Facturer laize × l’autre dimension (jamais laize × laize) ;
 * 3) Choisir l’orientation au **moindre coût** (plus petite surface facturée).
 *
 * Ex. 85×95 cm, laize 1 m :
 *   - 95 dans laize → facture 100×85 = 0,85 m²  (retenu)
 *   - 85 dans laize → facture 100×95 = 0,95 m²  (écarté, plus cher)
 */

import {
  GF_LAIZE_EXACT_TOLERANCE_CM,
  GF_LAIZE_MARGIN_CM,
  isDimWithinLaizeMargin,
} from '@/lib/grand-format/laize-utils';

export { isDimWithinLaizeMargin, GF_LAIZE_MARGIN_CM, GF_LAIZE_EXACT_TOLERANCE_CM };

export function sortUniqueLaizesCm(laizes: number[]): number[] {
  return [...new Set(laizes.filter((l) => Number.isFinite(l) && l > 0))].sort((a, b) => a - b);
}

/** Correspondance exacte dimension ↔ laize (±0,5 cm). */
export function findExactLaizeMatch(dimCm: number, laizes: number[]): number | null {
  const sorted = sortUniqueLaizesCm(laizes);
  for (const laize of sorted) {
    if (Math.abs(dimCm - laize) <= GF_LAIZE_EXACT_TOLERANCE_CM) {
      return laize;
    }
  }
  return null;
}

/** Plus petite laize capable de contenir la largeur de production. */
export function smallestFittingLaizeCm(productionWidthCm: number, laizes: number[]): number | null {
  return sortUniqueLaizesCm(laizes).find((l) => productionWidthCm <= l + 1e-6) ?? null;
}

/** Choisit la plus petite laize qui couvre la petite dimension (legacy helper). */
export function pickLaizeCm(
  petiteDimensionCm: number,
  availableLaizesCm: number[],
  explicitLaizeCm?: number | null,
): { laizeCm: number | null; exceedsAll: boolean } {
  const sorted = sortUniqueLaizesCm(availableLaizesCm);
  if (!sorted.length) {
    return { laizeCm: explicitLaizeCm ?? null, exceedsAll: false };
  }

  if (explicitLaizeCm && explicitLaizeCm > 0) {
    if (petiteDimensionCm > explicitLaizeCm) {
      return { laizeCm: explicitLaizeCm, exceedsAll: true };
    }
    return { laizeCm: explicitLaizeCm, exceedsAll: false };
  }

  const fitting = smallestFittingLaizeCm(petiteDimensionCm, sorted);
  if (!fitting) {
    return { laizeCm: null, exceedsAll: true };
  }
  return { laizeCm: fitting, exceedsAll: false };
}

/** Applique la règle des 30 cm avant laize. */
export function applyLaizeBillingRule(
  productionWidthCm: number,
  laizeCm: number,
): { billedWidthCm: number; ruleApplied: boolean; diffLaizeCm: number } {
  const diffLaizeCm = laizeCm - productionWidthCm;
  if (
    productionWidthCm > 0
    && productionWidthCm <= laizeCm + 1e-6
    && diffLaizeCm < GF_LAIZE_MARGIN_CM
    && diffLaizeCm > GF_LAIZE_EXACT_TOLERANCE_CM
  ) {
    return { billedWidthCm: laizeCm, ruleApplied: true, diffLaizeCm };
  }
  return { billedWidthCm: productionWidthCm, ruleApplied: false, diffLaizeCm };
}

export type LaizeBillingPlan = {
  laizeUtiliseeCm: number | null;
  largeurFactureeCm: number;
  longueurFactureeCm: number;
  laizeExactMatch: boolean;
  laizeRuleApplied: boolean;
  petiteDimensionCm: number;
  grandeDimensionCm: number;
  surfaceReelleM2: number;
  surfaceLaizeM2: number;
  surfaceFactureeM2: number;
  exceedsLaize: boolean;
  matierePerteCm: number | null;
  orientation: 'normal' | 'rotation' | 'assemblage' | null;
  assemblageRequired: boolean;
  strips: number;
  prodWidthCm: number;
  prodLengthCm: number;
};

type OrientationCandidate = {
  laize: number;
  prodWidth: number;
  prodLength: number;
  waste: number;
  billedWidth: number;
  ruleApplied: boolean;
  exactWidthMatch: boolean;
  billedSurfaceCm2: number;
  withinMargin: boolean;
};

function evaluateOrientation(
  prodWidthCm: number,
  prodLengthCm: number,
  laizes: number[],
): OrientationCandidate | null {
  const laize = smallestFittingLaizeCm(prodWidthCm, laizes);
  if (laize == null) return null;

  const exactWidthMatch = Math.abs(prodWidthCm - laize) <= GF_LAIZE_EXACT_TOLERANCE_CM;
  const withinMargin = isDimWithinLaizeMargin(prodWidthCm, laize);
  const { billedWidthCm, ruleApplied } = exactWidthMatch
    ? { billedWidthCm: laize, ruleApplied: false }
    : applyLaizeBillingRule(prodWidthCm, laize);

  return {
    laize,
    prodWidth: prodWidthCm,
    prodLength: prodLengthCm,
    waste: laize - prodWidthCm,
    billedWidth: billedWidthCm,
    ruleApplied,
    exactWidthMatch,
    billedSurfaceCm2: billedWidthCm * prodLengthCm,
    withinMargin,
  };
}

function evaluateWithinMarginPair(
  acrossCm: number,
  lengthCm: number,
  laizeCm: number,
): OrientationCandidate | null {
  if (!isDimWithinLaizeMargin(acrossCm, laizeCm)) return null;

  const exactWidthMatch = Math.abs(acrossCm - laizeCm) <= GF_LAIZE_EXACT_TOLERANCE_CM;
  const ruleApplied = !exactWidthMatch;
  return {
    laize: laizeCm,
    prodWidth: acrossCm,
    prodLength: lengthCm,
    waste: laizeCm - acrossCm,
    billedWidth: laizeCm,
    ruleApplied,
    exactWidthMatch,
    billedSurfaceCm2: laizeCm * lengthCm,
    withinMargin: true,
  };
}

/** Moindre surface facturée d’abord, puis plus petite laize (coût minimal). */
function pickBestCandidate(candidates: OrientationCandidate[]): OrientationCandidate {
  const ranked = [...candidates].sort((a, b) => {
    if (a.billedSurfaceCm2 !== b.billedSurfaceCm2) return a.billedSurfaceCm2 - b.billedSurfaceCm2;
    if (a.laize !== b.laize) return a.laize - b.laize;
    if (a.prodLength !== b.prodLength) return a.prodLength - b.prodLength;
    return a.waste - b.waste;
  });
  return ranked[0]!;
}

/**
 * Algorithme laize GF unique (tous articles Grand Format, format personnalisé).
 * Ex. 90×300 → 100×300 ; 270×300 → 320×270.
 */
export function computeLaizeOrientedBilling(
  largeurClientCm: number,
  hauteurClientCm: number,
  availableLaizesCm: number[],
): LaizeBillingPlan {
  const laizes = sortUniqueLaizesCm(availableLaizesCm);
  const petite = Math.min(largeurClientCm, hauteurClientCm);
  const grande = Math.max(largeurClientCm, hauteurClientCm);
  const surfaceReelleM2 = parseFloat(((petite * grande) / 10000).toFixed(4));

  const emptyExceeds: LaizeBillingPlan = {
    laizeUtiliseeCm: null,
    largeurFactureeCm: petite,
    longueurFactureeCm: grande,
    laizeExactMatch: false,
    laizeRuleApplied: false,
    petiteDimensionCm: petite,
    grandeDimensionCm: grande,
    surfaceReelleM2,
    surfaceLaizeM2: surfaceReelleM2,
    surfaceFactureeM2: surfaceReelleM2,
    exceedsLaize: true,
    matierePerteCm: null,
    orientation: 'assemblage',
    assemblageRequired: true,
    strips: 0,
    prodWidthCm: petite,
    prodLengthCm: grande,
  };

  if (!laizes.length) {
    return {
      ...emptyExceeds,
      exceedsLaize: false,
      surfaceFactureeM2: surfaceReelleM2,
    };
  }

  const marginCandidates: OrientationCandidate[] = [];
  for (const laize of laizes) {
    const a = evaluateWithinMarginPair(largeurClientCm, hauteurClientCm, laize);
    const b = evaluateWithinMarginPair(hauteurClientCm, largeurClientCm, laize);
    if (a) marginCandidates.push(a);
    if (b) marginCandidates.push(b);
  }

  let best: OrientationCandidate | null = null;

  if (marginCandidates.length) {
    best = pickBestCandidate(marginCandidates);
  } else {
    const fallback: OrientationCandidate[] = [];
    const orientations: [number, number][] = [
      [largeurClientCm, hauteurClientCm],
      [hauteurClientCm, largeurClientCm],
    ];
    for (const [prodWidth, prodLength] of orientations) {
      const candidate = evaluateOrientation(prodWidth, prodLength, laizes);
      if (candidate) fallback.push(candidate);
    }
    if (!fallback.length) return emptyExceeds;
    fallback.sort((a, b) => {
      if (a.billedSurfaceCm2 !== b.billedSurfaceCm2) return a.billedSurfaceCm2 - b.billedSurfaceCm2;
      if (a.laize !== b.laize) return a.laize - b.laize;
      if (a.prodLength !== b.prodLength) return a.prodLength - b.prodLength;
      return a.waste - b.waste;
    });
    best = fallback[0];
  }

  const surfaceFactureeM2 = parseFloat((best.billedSurfaceCm2 / 10000).toFixed(4));
  const surfaceLaizeM2 = parseFloat(((best.laize * best.prodLength) / 10000).toFixed(4));

  let orientation: 'normal' | 'rotation' = 'normal';
  if (best.prodWidth === hauteurClientCm && best.prodLength === largeurClientCm) {
    orientation = 'rotation';
  }

  return {
    laizeUtiliseeCm: best.laize,
    largeurFactureeCm: best.billedWidth,
    longueurFactureeCm: best.prodLength,
    laizeExactMatch: best.exactWidthMatch,
    laizeRuleApplied: best.ruleApplied,
    petiteDimensionCm: petite,
    grandeDimensionCm: grande,
    surfaceReelleM2,
    surfaceLaizeM2,
    surfaceFactureeM2,
    exceedsLaize: false,
    matierePerteCm: best.waste,
    orientation,
    assemblageRequired: false,
    strips: 1,
    prodWidthCm: best.prodWidth,
    prodLengthCm: best.prodLength,
  };
}
