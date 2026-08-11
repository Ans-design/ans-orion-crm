/**
 * Moteur central laize Grand Format — surfaces réelle / consommée / facturable.
 */

import {
  GF_LAIZE_MARGIN_CM,
  parseLaizeLabelToCm,
  formatLaizeChipLabel,
  laizeCmToChipLabel,
} from '@/lib/grand-format/laize-utils';
import {
  computeLaizeOrientedBilling,
  sortUniqueLaizesCm,
} from '@/lib/grand-format/laize-billing';

export { GF_LAIZE_MARGIN_CM, parseLaizeLabelToCm, formatLaizeChipLabel };
export { sortUniqueLaizesCm };

export type LaizeOrientation = 'normal' | 'rotation' | 'assemblage';

export type LaizeUsageResult = {
  orientation: LaizeOrientation;
  longueurConsommeeM: number;
  surfaceLaizeM2: number;
  assemblageRequired: boolean;
  strips: number;
};

export type LaizeCandidate = {
  laizeCm: number;
  laizeLabel: string;
  orientation: LaizeOrientation;
  realShortSideCm: number;
  realLongSideCm: number;
  billableShortSideCm: number;
  billableLongSideCm: number;
  surfaceReelleM2: number;
  surfaceLaizeM2: number;
  surfaceFacturableM2: number;
  wasteM2: number;
  isNearLaizeRounded: boolean;
  exactLaizeMatch: boolean;
  assemblageRequired: boolean;
  strips: number;
  laizeRuleLabel: string;
};

export type GrandFormatLaizeEvaluation = {
  candidate: LaizeCandidate | null;
  assemblageCandidates: LaizeCandidate[];
  surfaceReelleM2: number;
  recommendedLaizeLabel: string | null;
  ruleMessage: string | null;
};

export const GF_MATERIAL_LAIZES_CM: Record<string, number[]> = {
  bache_pvc_440: [100, 140, 160, 180, 240, 320],
  bache_pvc_510: [100, 140, 160, 180, 240, 320],
  bache_pvc_650: [160, 320],
  bache_mesh_270: [160],
  vinyle_140: [100, 150],
  dos_bleu_120: [120, 150],
  oneway_140: [120],
  pp_film_140: [90, 100],
  photo_140: [100],
  reflechissant_140: [100, 120, 150],
  frosted_140: [120],
  tissu_drapeau: [150, 160],
  toile_canvas: [100, 150],
  flex_50: [50],
  plaque_240x120: [120, 240],
};

export const BACHE_ALIASES: Record<string, string> = {
  bache440: 'gf-bache',
  bache_440: 'gf-bache',
  bache160: 'gf-bache',
  bache180: 'gf-bache',
  bache240: 'gf-bache',
  bache320: 'gf-bache',
  bache_large: 'gf-bache',
  bache_large_320: 'gf-bache',
  mesh270: 'gf-bache',
  mesh: 'gf-bache',
  banderole: 'gf-bache',
  'gf-bache440': 'gf-bache',
  'gf-mesh': 'gf-bache',
  'gf-bache320': 'gf-bache',
};

function roundM2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Surface consommée sur rouleau selon laize et orientation. */
export function evaluateLaizeUsage(params: {
  longueurM: number;
  largeurM: number;
  laizeM: number;
  quantite?: number;
}): LaizeUsageResult {
  const qty = Math.max(1, params.quantite ?? 1);
  const { longueurM, largeurM, laizeM } = params;

  if (!laizeM || laizeM <= 0) {
    return {
      orientation: 'normal',
      longueurConsommeeM: longueurM,
      surfaceLaizeM2: roundM2(longueurM * largeurM * qty),
      assemblageRequired: false,
      strips: 1,
    };
  }

  const fitsNormal = largeurM <= laizeM + 1e-6;
  const fitsRotated = longueurM <= laizeM + 1e-6;

  // Les deux orientations possibles → garder la moins chère (laize × côté déroulé min)
  if (fitsNormal && fitsRotated) {
    const normalM2 = longueurM * laizeM * qty;
    const rotatedM2 = largeurM * laizeM * qty;
    if (rotatedM2 < normalM2 - 1e-9) {
      return {
        orientation: 'rotation',
        longueurConsommeeM: largeurM,
        surfaceLaizeM2: roundM2(rotatedM2),
        assemblageRequired: false,
        strips: 1,
      };
    }
    return {
      orientation: 'normal',
      longueurConsommeeM: longueurM,
      surfaceLaizeM2: roundM2(normalM2),
      assemblageRequired: false,
      strips: 1,
    };
  }

  if (fitsNormal) {
    return {
      orientation: 'normal',
      longueurConsommeeM: longueurM,
      surfaceLaizeM2: roundM2(longueurM * laizeM * qty),
      assemblageRequired: false,
      strips: 1,
    };
  }

  if (fitsRotated) {
    return {
      orientation: 'rotation',
      longueurConsommeeM: largeurM,
      surfaceLaizeM2: roundM2(largeurM * laizeM * qty),
      assemblageRequired: false,
      strips: 1,
    };
  }

  const strips = Math.ceil(largeurM / laizeM);
  const longueurConsommeeM = longueurM * strips;
  return {
    orientation: 'assemblage',
    longueurConsommeeM,
    surfaceLaizeM2: roundM2(longueurConsommeeM * laizeM * qty),
    assemblageRequired: true,
    strips,
  };
}

export function cmToLaizeChipLabel(cm: number): string {
  return laizeCmToChipLabel(cm);
}

export function laizeChipToCm(label: string): number | null {
  return parseLaizeLabelToCm(label);
}

export function getBacheAvailableLaizesCm(typeBache: string, grammage: string): number[] {
  if (typeBache === 'Mesh micro-perforé' || grammage === '270g') {
    return GF_MATERIAL_LAIZES_CM.bache_mesh_270;
  }
  if (typeBache === 'Bâche PVC renforcée' && grammage === '650g') {
    return GF_MATERIAL_LAIZES_CM.bache_pvc_650;
  }
  return GF_MATERIAL_LAIZES_CM.bache_pvc_440;
}

function evaluateAssemblage(
  shortSideCm: number,
  longSideCm: number,
  laizeCm: number,
  quantity: number,
): LaizeCandidate {
  const strips = Math.ceil(shortSideCm / laizeCm);
  const longueurConsommeeCm = longSideCm * strips;
  const surfaceReelleM2 = roundM2((shortSideCm * longSideCm * quantity) / 10000);
  const surfaceLaizeM2 = roundM2((laizeCm * longueurConsommeeCm * quantity) / 10000);

  return {
    laizeCm,
    laizeLabel: cmToLaizeChipLabel(laizeCm),
    orientation: 'assemblage',
    realShortSideCm: shortSideCm,
    realLongSideCm: longSideCm,
    billableShortSideCm: shortSideCm,
    billableLongSideCm: longSideCm,
    surfaceReelleM2,
    surfaceLaizeM2,
    surfaceFacturableM2: surfaceLaizeM2,
    wasteM2: roundM2(surfaceLaizeM2 - surfaceReelleM2),
    isNearLaizeRounded: false,
    exactLaizeMatch: false,
    assemblageRequired: true,
    strips,
    laizeRuleLabel: `Assemblage requis — ${strips} bande(s) × laize ${cmToLaizeChipLabel(laizeCm)}`,
  };
}

/**
 * Bâche / mesh — délègue au moteur unique `computeLaizeOrientedBilling`
 * (identique vinyle, plaques, et tous GF format personnalisé).
 */
export function evaluateBestLaizeCandidate(params: {
  longueurCm: number;
  largeurCm: number;
  availableLaizesCm: number[];
  quantity?: number;
  thresholdCm?: number;
  explicitLaizeCm?: number | null;
}): GrandFormatLaizeEvaluation {
  const qty = Math.max(1, params.quantity ?? 1);
  const pool = sortUniqueLaizesCm(
    params.explicitLaizeCm && params.explicitLaizeCm > 0
      ? [params.explicitLaizeCm]
      : params.availableLaizesCm,
  );
  const surfaceReelleM2 = roundM2((params.longueurCm * params.largeurCm * qty) / 10000);
  const assemblageCandidates: LaizeCandidate[] = [];

  const plan = computeLaizeOrientedBilling(params.largeurCm, params.longueurCm, pool);

  if (plan.exceedsLaize || plan.assemblageRequired) {
    const laizeCm =
      params.explicitLaizeCm && params.explicitLaizeCm > 0
        ? params.explicitLaizeCm
        : pool[pool.length - 1] ?? null;
    if (laizeCm) {
      const short = Math.min(params.longueurCm, params.largeurCm);
      const long = Math.max(params.longueurCm, params.largeurCm);
      assemblageCandidates.push(evaluateAssemblage(short, long, laizeCm, qty));
    }
    const candidate = assemblageCandidates[0] ?? null;
    return {
      candidate,
      assemblageCandidates,
      surfaceReelleM2,
      recommendedLaizeLabel: candidate?.laizeLabel ?? null,
      ruleMessage: candidate?.laizeRuleLabel ?? null,
    };
  }

  const laizeCm = plan.laizeUtiliseeCm!;
  const across = plan.prodWidthCm;
  const length = plan.prodLengthCm;
  let laizeRuleLabel = 'Aucun arrondi appliqué';
  if (plan.laizeExactMatch) {
    laizeRuleLabel = 'Correspondance exacte laize — pas d\'arrondi';
  } else if (plan.laizeRuleApplied) {
    const diff = Math.round(laizeCm - across);
    laizeRuleLabel = `Conversion laize : oui, écart ${diff} cm < ${GF_LAIZE_MARGIN_CM} cm`;
  } else if (laizeCm > across) {
    const diff = Math.round(laizeCm - across);
    laizeRuleLabel = `Conversion laize : non, écart ${diff} cm ≥ ${GF_LAIZE_MARGIN_CM} cm`;
  }

  const candidate: LaizeCandidate = {
    laizeCm,
    laizeLabel: cmToLaizeChipLabel(laizeCm),
    orientation: plan.orientation === 'rotation' ? 'rotation' : 'normal',
    realShortSideCm: across,
    realLongSideCm: length,
    billableShortSideCm: plan.largeurFactureeCm,
    billableLongSideCm: plan.longueurFactureeCm,
    surfaceReelleM2: roundM2(plan.surfaceReelleM2 * qty),
    surfaceLaizeM2: roundM2(plan.surfaceLaizeM2 * qty),
    surfaceFacturableM2: roundM2(plan.surfaceFactureeM2 * qty),
    wasteM2: roundM2((plan.surfaceLaizeM2 - plan.surfaceReelleM2) * qty),
    isNearLaizeRounded: plan.laizeRuleApplied,
    exactLaizeMatch: plan.laizeExactMatch,
    assemblageRequired: false,
    strips: 1,
    laizeRuleLabel,
  };

  // Recommandation auto = moteur sans laize forcée (pool complet)
  const autoPlan = params.explicitLaizeCm
    ? computeLaizeOrientedBilling(
        params.largeurCm,
        params.longueurCm,
        sortUniqueLaizesCm(params.availableLaizesCm),
      )
    : plan;
  const recommendedLaizeLabel =
    autoPlan.laizeUtiliseeCm != null && !autoPlan.exceedsLaize
      ? cmToLaizeChipLabel(autoPlan.laizeUtiliseeCm)
      : candidate.laizeLabel;

  return {
    candidate,
    assemblageCandidates,
    surfaceReelleM2,
    recommendedLaizeLabel,
    ruleMessage: candidate.laizeRuleLabel,
  };
}

export function isDosBlanc(dosLabel: string): boolean {
  return /blanc/i.test(dosLabel);
}

export function impressionAllowsRectoVerso(dosLabel: string): boolean {
  return isDosBlanc(dosLabel);
}
