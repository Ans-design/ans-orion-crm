/**
 * API centrale Grand Format / surface m².
 * Orchestrates laize (seuil 30 cm) + prix m² + marges découpe A0–A5.
 */
import {
  computeGrandFormatBillable,
  computeLaizeOrientedBilling,
} from '@/lib/grand-format/pricing';
import {
  applyGfCuttingMarginToA0Price,
  applyGfCuttingMarginToUnitPrice,
  extractGfStandardFormatCode,
  getGfCuttingMargins,
  type GfCuttingMarginApplication,
} from '@/lib/grand-format/cutting-margins';
import { GF_LAIZE_MARGIN_CM } from '@/lib/grand-format/laize-utils';
import type { GrandFormatBillableResult } from '@/lib/grand-format/types';
import type { GfPricingSurfaceMode } from '@/lib/grand-format/gf-admin-config';

export type CalculateGrandFormatPriceInput = {
  config: Record<string, unknown>;
  prixM2: number | null;
  availableLaizesCm: number[];
  stockKind?: 'rouleau' | 'plaque';
  pricingSurfaceMode?: GfPricingSurfaceMode;
  quantite?: number;
  finitionsAr?: number;
  mainOeuvreAr?: number;
  discountPercent?: number;
  /** Formats A0–A5 : prix = A0 × ratio + marge découpe (défaut true). */
  useA0FractionPricing?: boolean;
};

export type CalculateGrandFormatPriceResult = GrandFormatBillableResult & {
  conversionLaize: boolean;
  conversionLaizeLabel: string;
  diffLaizeCm: number | null;
  prixBase: number;
  margeDecoupe: GfCuttingMarginApplication | null;
  finitionsAr: number;
  mainOeuvreAr: number;
  remisePercent: number;
  remiseAr: number;
  prixUnitaireFinal: number;
  prixTotal: number;
  quantite: number;
  formula: string;
};

function buildConversionMeta(bill: GrandFormatBillableResult): {
  conversionLaize: boolean;
  conversionLaizeLabel: string;
  diffLaizeCm: number | null;
} {
  if (bill.laizeUtiliseeCm == null) {
    return {
      conversionLaize: false,
      conversionLaizeLabel: 'Conversion laize : non applicable',
      diffLaizeCm: null,
    };
  }
  if (bill.laizeExactMatch) {
    return {
      conversionLaize: false,
      conversionLaizeLabel: 'Correspondance exacte laize — pas de conversion',
      diffLaizeCm: 0,
    };
  }
  // Écart = laize − dim accrochée (celle qui n'est pas la longueur facturée)
  const lengthCm = bill.longueurFactureeCm;
  const acrossCm =
    Math.abs(bill.clientLargeurCm - lengthCm) <= 0.6
      ? bill.clientHauteurCm
      : Math.abs(bill.clientHauteurCm - lengthCm) <= 0.6
        ? bill.clientLargeurCm
        : bill.petiteDimensionCm;
  const diffLaizeCm = Math.round((bill.laizeUtiliseeCm - acrossCm) * 100) / 100;
  if (bill.laizeRuleApplied) {
    return {
      conversionLaize: true,
      conversionLaizeLabel: `Conversion laize : oui, car écart < ${GF_LAIZE_MARGIN_CM} cm`,
      diffLaizeCm,
    };
  }
  return {
    conversionLaize: false,
    conversionLaizeLabel: `Conversion laize : non, écart ≥ ${GF_LAIZE_MARGIN_CM} cm`,
    diffLaizeCm,
  };
}

/**
 * Calcul Grand Format complet — source unique pour POS / devis / panier.
 */
export function calculateGrandFormatPrice(
  input: CalculateGrandFormatPriceInput,
): CalculateGrandFormatPriceResult {
  const qty = Math.max(1, Number(input.quantite) || 1);
  const finitionsAr = Math.max(0, Number(input.finitionsAr) || 0);
  const mainOeuvreAr = Math.max(0, Number(input.mainOeuvreAr) || 0);
  const discountPercent = Math.max(0, Number(input.discountPercent) || 0);
  const formatRaw = String(input.config.format ?? '');
  const formatCode = extractGfStandardFormatCode(formatRaw);
  const margins = getGfCuttingMargins();
  const isPerso = /personnalis/i.test(formatRaw);

  // Formats ISO standards : prix A0 × ratio + marge découpe
  if (
    input.useA0FractionPricing !== false
    && formatCode
    && !isPerso
    && input.prixM2
    && input.prixM2 > 0
  ) {
    const cut = applyGfCuttingMarginToA0Price(input.prixM2, formatCode, margins);
    if (cut) {
      // Pas de pool laize : ISO standard = hors règles de laize.
      const emptyBill = computeGrandFormatBillable({
        config: input.config,
        availableLaizesCm: [],
        prixM2: input.prixM2,
        stockKind: input.stockKind ?? 'plaque',
        pricingSurfaceMode: input.pricingSurfaceMode,
      });
      const sub = cut.finalPrice + finitionsAr + mainOeuvreAr;
      const remiseAr = Math.round(sub * (discountPercent / 100));
      const unit = Math.max(0, sub - remiseAr);
      return {
        ...emptyBill,
        laizeUtiliseeCm: null,
        laizeLabel: null,
        laizeExactMatch: false,
        laizeRuleApplied: false,
        surfaceLaizeM2: 0,
        prixUnitaire: cut.finalPrice,
        calculable: true,
        surDevis: false,
        conversionLaize: false,
        conversionLaizeLabel: 'Format ISO standard — laize non applicable',
        diffLaizeCm: null,
        prixBase: cut.basePrice,
        margeDecoupe: cut,
        finitionsAr,
        mainOeuvreAr,
        remisePercent: discountPercent,
        remiseAr,
        prixUnitaireFinal: unit,
        prixTotal: unit * qty,
        quantite: qty,
        formula: `A0×${cut.surfaceRatio}+marge${cut.marginPercent}%`,
        ruleMessage: `Format ${cut.formatCode} : ${cut.basePrice} + ${cut.marginPercent}% découpe = ${cut.finalPrice} Ar (sans laize)`,
      };
    }
  }

  const bill = computeGrandFormatBillable({
    config: input.config,
    availableLaizesCm: input.availableLaizesCm,
    prixM2: input.prixM2,
    stockKind: input.stockKind ?? 'rouleau',
    pricingSurfaceMode: input.pricingSurfaceMode,
  });

  const conv = buildConversionMeta(bill);
  let prixBase = bill.prixUnitaire;
  let margeDecoupe: GfCuttingMarginApplication | null = null;

  if (formatCode && !isPerso && bill.calculable && bill.prixUnitaire > 0) {
    margeDecoupe = applyGfCuttingMarginToUnitPrice(bill.prixUnitaire, formatRaw, margins);
    if (margeDecoupe && margeDecoupe.marginPercent > 0) {
      prixBase = margeDecoupe.basePrice;
      bill.prixUnitaire = margeDecoupe.finalPrice;
    }
  }

  const sub = bill.prixUnitaire + finitionsAr + mainOeuvreAr;
  const remiseAr = Math.round(sub * (discountPercent / 100));
  const unit = Math.max(0, sub - remiseAr);

  const ruleMsg = bill.ruleMessage
    ?? (conv.conversionLaize
      ? conv.conversionLaizeLabel
      : conv.conversionLaizeLabel);

  return {
    ...bill,
    ...conv,
    ruleMessage: ruleMsg,
    margeDecoupePercent: margeDecoupe?.marginPercent,
    margeDecoupeAr: margeDecoupe && margeDecoupe.marginPercent > 0 ? margeDecoupe.supplement : undefined,
    prixBase,
    margeDecoupe,
    finitionsAr,
    mainOeuvreAr,
    remisePercent: discountPercent,
    remiseAr,
    prixUnitaireFinal: unit,
    prixTotal: unit * qty,
    quantite: qty,
    formula: `surfFacturée×prixM2${margeDecoupe && margeDecoupe.marginPercent > 0 ? `+marge${margeDecoupe.marginPercent}%` : ''}`,
  };
}

/** Helper tests — dims en mètres. */
export function calculateGrandFormatPriceFromMeters(params: {
  lengthM: number;
  widthM: number;
  prixM2: number;
  laizesM: number[];
  format?: string;
  quantite?: number;
  useA0FractionPricing?: boolean;
}): CalculateGrandFormatPriceResult {
  return calculateGrandFormatPrice({
    config: {
      format: params.format ?? 'Format personnalisé',
      largeur_cm: params.widthM * 100,
      hauteur_cm: params.lengthM * 100,
    },
    prixM2: params.prixM2,
    availableLaizesCm: params.laizesM.map((m) => m * 100),
    stockKind: 'rouleau',
    quantite: params.quantite,
    useA0FractionPricing: params.useA0FractionPricing ?? false,
  });
}

export { computeLaizeOrientedBilling, computeGrandFormatBillable };
