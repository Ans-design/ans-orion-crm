import { GF_LAIZE_MARGIN_CM, parseLaizeLabelToCm } from '@/lib/grand-format/laize-utils';
import {
  computeLaizeOrientedBilling,
  sortUniqueLaizesCm,
  type LaizeBillingPlan,
} from '@/lib/grand-format/laize-billing';
import type { GrandFormatBillableResult } from '@/lib/grand-format/types';
import {
  DEFAULT_GF_ADMIN_PRICING,
  recommendedGfPricingMode,
  resolveGfBillableSurfaceM2,
  type GfPricingSurfaceMode,
} from '@/lib/grand-format/gf-admin-config';
import { cmToLaizeChipLabel, evaluateLaizeUsage } from '@/lib/print/grand-format-laize-rules';
import { computeGrandFormatDimensions } from '@/lib/pricing/format-dimensions';

export {
  applyLaizeBillingRule,
  computeLaizeOrientedBilling,
  findExactLaizeMatch,
  isDimWithinLaizeMargin,
  pickLaizeCm,
  smallestFittingLaizeCm,
  sortUniqueLaizesCm,
  type LaizeBillingPlan,
} from '@/lib/grand-format/laize-billing';

const FORMAT_PERSO = 'format personnalisé';

export function isGrandFormatCustomFormat(config: Record<string, unknown>): boolean {
  const fmt = String(config.format || '').trim().toLowerCase();
  return fmt.includes(FORMAT_PERSO) || fmt === 'autres';
}

/**
 * Règles de laize (-30 cm) : format personnalisé — tous articles GF (rouleau + plaque).
 * Formats ISO A0–A5 : hors laize.
 */
export function shouldApplyGfLaizeRules(config: Record<string, unknown>): boolean {
  return isGrandFormatCustomFormat(config);
}

/** @deprecated Préférer computeLaizeOrientedBilling — conservé pour tests unitaires ciblés. */
export function computeBillableSurfaceM2(
  dim1Cm: number,
  dim2Cm: number,
  laizeCm: number | null,
  options?: { applyLaizeRule?: boolean; explicitLaizeCm?: number | null },
): {
  petiteDimensionCm: number;
  grandeDimensionCm: number;
  laizeUtiliseeCm: number | null;
  laizeRuleApplied: boolean;
  surfaceReelleM2: number;
  surfaceFactureeM2: number;
  exceedsLaize: boolean;
} {
  if (!options?.applyLaizeRule || !laizeCm || laizeCm <= 0) {
    const petite = Math.min(dim1Cm, dim2Cm);
    const grande = Math.max(dim1Cm, dim2Cm);
    const surfaceReelleM2 = parseFloat(((petite * grande) / 10000).toFixed(4));
    return {
      petiteDimensionCm: petite,
      grandeDimensionCm: grande,
      laizeUtiliseeCm: null,
      laizeRuleApplied: false,
      surfaceReelleM2,
      surfaceFactureeM2: surfaceReelleM2,
      exceedsLaize: false,
    };
  }

  const plan = computeLaizeOrientedBilling(dim1Cm, dim2Cm, [laizeCm]);
  if (plan.exceedsLaize) {
    return {
      petiteDimensionCm: plan.petiteDimensionCm,
      grandeDimensionCm: plan.grandeDimensionCm,
      laizeUtiliseeCm: laizeCm,
      laizeRuleApplied: false,
      surfaceReelleM2: plan.surfaceReelleM2,
      surfaceFactureeM2: plan.surfaceReelleM2,
      exceedsLaize: true,
    };
  }

  return {
    petiteDimensionCm: plan.petiteDimensionCm,
    grandeDimensionCm: plan.grandeDimensionCm,
    laizeUtiliseeCm: plan.laizeUtiliseeCm,
    laizeRuleApplied: plan.laizeRuleApplied,
    surfaceReelleM2: plan.surfaceReelleM2,
    surfaceFactureeM2: plan.surfaceFactureeM2,
    exceedsLaize: false,
  };
}

function billPlanFromDims(dims: { largeur: number; hauteur: number; m2: number }): LaizeBillingPlan {
  return {
    laizeUtiliseeCm: null,
    largeurFactureeCm: dims.largeur,
    longueurFactureeCm: dims.hauteur,
    laizeExactMatch: false,
    laizeRuleApplied: false,
    petiteDimensionCm: Math.min(dims.largeur, dims.hauteur),
    grandeDimensionCm: Math.max(dims.largeur, dims.hauteur),
    surfaceReelleM2: dims.m2,
    surfaceLaizeM2: dims.m2,
    surfaceFactureeM2: dims.m2,
    exceedsLaize: false,
    matierePerteCm: null,
    orientation: null,
    assemblageRequired: false,
    strips: 1,
    prodWidthCm: Math.min(dims.largeur, dims.hauteur),
    prodLengthCm: Math.max(dims.largeur, dims.hauteur),
  };
}

function enrichBillWithAssemblage(
  bill: LaizeBillingPlan,
  dims: { largeur: number; hauteur: number },
  laizeCm: number | null,
): LaizeBillingPlan {
  if (!bill.exceedsLaize || !laizeCm) return bill;
  const usage = evaluateLaizeUsage({
    longueurM: dims.largeur / 100,
    largeurM: dims.hauteur / 100,
    laizeM: laizeCm / 100,
    quantite: 1,
  });
  return {
    ...bill,
    laizeUtiliseeCm: laizeCm,
    surfaceLaizeM2: usage.surfaceLaizeM2,
    orientation: usage.orientation,
    assemblageRequired: usage.assemblageRequired,
    strips: usage.strips,
  };
}

function toGfBillableResult(
  dims: { largeur: number; hauteur: number },
  bill: LaizeBillingPlan,
  params: {
    prixM2: number | null;
    stockKind: 'rouleau' | 'plaque';
    pricingSurfaceMode?: GfPricingSurfaceMode;
    calculable?: boolean;
    surDevis?: boolean;
    warning?: string;
  },
): GrandFormatBillableResult {
  // Format perso + laize : toujours surface facturée intelligente (identique bâche/vinyle/plaque)
  const pricingSurfaceMode =
    params.pricingSurfaceMode
    ?? (bill.laizeUtiliseeCm != null
      ? 'intelligente'
      : DEFAULT_GF_ADMIN_PRICING.pricingSurfaceMode ?? recommendedGfPricingMode(params.stockKind));

  const billableM2 = resolveGfBillableSurfaceM2({
    mode: pricingSurfaceMode,
    surfaceReelleM2: bill.surfaceReelleM2,
    surfaceLaizeM2: bill.surfaceLaizeM2,
    surfaceFactureeM2: bill.surfaceFactureeM2,
  });

  const prixM2 = params.prixM2;
  const prixUnitaire =
    params.calculable === false || !prixM2 || prixM2 <= 0
      ? 0
      : Math.round(billableM2 * prixM2);

  let ruleMessage: string | undefined;
  if (bill.laizeRuleApplied) {
    ruleMessage = `Conversion laize : oui, car écart < ${GF_LAIZE_MARGIN_CM} cm`;
  } else if (bill.laizeExactMatch) {
    ruleMessage = 'Correspondance exacte laize — pas de conversion';
  } else if (bill.assemblageRequired) {
    ruleMessage = `Assemblage requis — ${bill.strips} bande(s)`;
  } else if (bill.laizeUtiliseeCm != null && bill.petiteDimensionCm < bill.laizeUtiliseeCm) {
    ruleMessage = `Conversion laize : non, écart ≥ ${GF_LAIZE_MARGIN_CM} cm`;
  }

  return {
    clientLargeurCm: dims.largeur,
    clientHauteurCm: dims.hauteur,
    petiteDimensionCm: bill.petiteDimensionCm,
    grandeDimensionCm: bill.grandeDimensionCm,
    laizeUtiliseeCm: bill.laizeUtiliseeCm,
    laizeLabel: bill.laizeUtiliseeCm ? cmToLaizeChipLabel(bill.laizeUtiliseeCm) : null,
    laizeExactMatch: bill.laizeExactMatch,
    laizeRuleApplied: bill.laizeRuleApplied,
    largeurFactureeCm: bill.largeurFactureeCm,
    longueurFactureeCm: bill.longueurFactureeCm,
    orientation: bill.orientation,
    assemblageRequired: bill.assemblageRequired,
    strips: bill.strips,
    surfaceReelleM2: bill.surfaceReelleM2,
    surfaceLaizeM2: bill.surfaceLaizeM2,
    surfaceFactureeM2: bill.surfaceFactureeM2,
    pricingSurfaceMode,
    prixM2: prixM2 && prixM2 > 0 ? prixM2 : null,
    prixUnitaire,
    calculable: params.calculable ?? prixUnitaire > 0,
    surDevis: params.surDevis ?? false,
    warning: params.warning,
    ruleMessage,
  };
}

export function computeGrandFormatBillable(params: {
  config: Record<string, unknown>;
  availableLaizesCm: number[];
  prixM2: number | null;
  stockKind: 'rouleau' | 'plaque';
  pricingSurfaceMode?: GfPricingSurfaceMode;
}): GrandFormatBillableResult {
  const dims = computeGrandFormatDimensions(params.config);
  if (!dims) {
    return toGfBillableResult(
      { largeur: 0, hauteur: 0 },
      billPlanFromDims({ largeur: 0, hauteur: 0, m2: 0 }),
      {
        prixM2: params.prixM2,
        stockKind: params.stockKind,
        pricingSurfaceMode: params.pricingSurfaceMode,
        calculable: false,
        surDevis: true,
        warning: 'Dimensions requises pour le calcul.',
      },
    );
  }

  const explicitLaize =
    parseLaizeLabelToCm(String(params.config.laize_autre ?? '')) ??
    parseLaizeLabelToCm(String(params.config.laize_plaque_autre ?? '')) ??
    parseLaizeLabelToCm(String(params.config.laize ?? '')) ??
    parseLaizeLabelToCm(String(params.config.laize_plaque ?? '')) ??
    null;

  // Format personnalisé : même règle laize pour rouleau ET plaque (ISO A0–A5 exclus).
  const applyLaize = shouldApplyGfLaizeRules(params.config);

  let laizePool = sortUniqueLaizesCm(params.availableLaizesCm);
  if (applyLaize && explicitLaize) {
    // Laize choisie manuellement : moteur unique sur ce pool (force la laize)
    laizePool = sortUniqueLaizesCm([explicitLaize, ...laizePool]);
  }

  let bill: LaizeBillingPlan =
    applyLaize && laizePool.length > 0
      ? computeLaizeOrientedBilling(
          dims.largeur,
          dims.hauteur,
          // Si chip laize explicite → facturer avec cette laize uniquement
          explicitLaize && explicitLaize > 0 ? [explicitLaize] : laizePool,
        )
      : billPlanFromDims(dims);

  if (applyLaize && bill.exceedsLaize) {
    const fallbackLaize = explicitLaize ?? laizePool[laizePool.length - 1] ?? null;
    bill = enrichBillWithAssemblage(bill, dims, fallbackLaize);
    return toGfBillableResult(dims, bill, {
      prixM2: params.prixM2,
      stockKind: params.stockKind,
      pricingSurfaceMode: params.pricingSurfaceMode,
      calculable: false,
      surDevis: true,
      warning:
        'Dimension supérieure à la laize disponible. Devis manuel ou assemblage nécessaire.',
    });
  }

  if (!params.prixM2 || params.prixM2 <= 0) {
    return toGfBillableResult(dims, bill, {
      prixM2: null,
      stockKind: params.stockKind,
      pricingSurfaceMode: params.pricingSurfaceMode,
      calculable: false,
      surDevis: true,
      warning: 'Prix A0 admin manquant — configurez le tarif A0 pour cet article.',
    });
  }

  return toGfBillableResult(dims, bill, {
    prixM2: params.prixM2,
    stockKind: params.stockKind,
    pricingSurfaceMode: params.pricingSurfaceMode,
    calculable: true,
    surDevis: false,
  });
}
