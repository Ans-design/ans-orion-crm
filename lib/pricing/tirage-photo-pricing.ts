/**
 * Moteur prix Tirage photo — base A4 Admin × règles formats ISF (ratio + découpe + supplément).
 * Type papier photo : aucun impact prix.
 * Formats commerciaux → équivalences métier (photo-format-equivalences).
 */
import { getImpressionSfFormatRules } from '@/lib/pricing/impression-sf-pricing';
import {
  computePaperFormatPrice,
  findPaperFormatRule,
  type PaperFormatRuleLike,
} from '@/lib/pricing/paper-format-rules';
import {
  formatPhotoBillingMessage,
  resolvePhotoBillingFormat,
  resolvePhotoFormatFromLabel,
} from '@/lib/pricing/photo-format-equivalences';

export const PH_TIRAGE_ID = 'ph-tirage';

/** IDs legacy éventuels (cartes par format) → fusion vers ph-tirage. */
export const PH_TIRAGE_LEGACY_IDS = new Set([
  'ph-tirage-a4',
  'ph-tirage-a5',
  'ph-tirage-a6',
  'ph-tirage-a3',
  'ph-tirage-a3-pellicule',
  'ph-tirage-a3-pelliculé',
  'ph-tirage-pellicule',
  'tirage-photo-a4',
  'tirage-photo-a5',
  'tirage-photo-a6',
  'tirage-photo-a3',
  'tirage-photo-a3-pellicule',
  'AVD032',
  'AVD033',
  'AVD034',
  'AVD035',
  'ds-tirage-photo-a4',
  'ds-tirage-photo-a5',
  'ds-tirage-photo-a6',
  'ds-tirage-photo-a3-pellicule',
]);

export type TiragePhotoParamLike = {
  prixBaseA4: number;
};

export const DEFAULT_TIRAGE_PHOTO_PARAMS: TiragePhotoParamLike = {
  prixBaseA4: 3000,
};

let cachedParams: TiragePhotoParamLike = DEFAULT_TIRAGE_PHOTO_PARAMS;

export function setTiragePhotoRuntimeParams(p: TiragePhotoParamLike | null) {
  if (p) cachedParams = p;
}

export function getTiragePhotoRuntimeParams(): TiragePhotoParamLike {
  return cachedParams;
}

export function isTiragePhotoArticleId(articleId: string): boolean {
  return (
    articleId === PH_TIRAGE_ID
    || articleId.startsWith('ph-tirage')
    || PH_TIRAGE_LEGACY_IDS.has(articleId)
  );
}

export function parseTiragePhotoFormatInput(config: Record<string, unknown>): {
  formatCode: string | null;
  widthMm: number;
  heightMm: number;
  isCustom: boolean;
  chosenLabel: string;
} {
  const raw = String(config.format ?? '').trim();
  const isCustomChip = /personnalis/i.test(raw);

  if (isCustomChip) {
    let w = Number(config.format_largeur) || Number(config.largeur_mm) || 0;
    let h = Number(config.format_hauteur) || Number(config.hauteur_mm) || 0;
    if (w > 0 && w < 80 && h > 0 && h < 80) {
      w *= 10;
      h *= 10;
    }
    return { formatCode: null, widthMm: w, heightMm: h, isCustom: true, chosenLabel: raw || 'Format personnalisé' };
  }

  const resolved = resolvePhotoFormatFromLabel(raw);
  if (resolved.billingFormat && !resolved.isCustom) {
    return {
      formatCode: resolved.billingFormat,
      widthMm: resolved.widthMm,
      heightMm: resolved.heightMm,
      isCustom: false,
      chosenLabel: resolved.chosenLabel || raw,
    };
  }

  if (resolved.widthMm > 0 && resolved.heightMm > 0) {
    return {
      formatCode: null,
      widthMm: resolved.widthMm,
      heightMm: resolved.heightMm,
      isCustom: true,
      chosenLabel: resolved.chosenLabel || raw,
    };
  }

  return {
    formatCode: 'A4',
    widthMm: 210,
    heightMm: 297,
    isCustom: false,
    chosenLabel: raw || 'A4 — 210×297 mm',
  };
}

/**
 * Format photo / perso → format facturation (équivalences commerciales puis supérieur).
 */
export function resolveTiragePhotoFormat(
  widthMm: number,
  heightMm: number,
  rules: PaperFormatRuleLike[] = getImpressionSfFormatRules(),
): { formatCode: string | null; surDevis: boolean; reason: string } {
  const resolved = resolvePhotoBillingFormat(widthMm, heightMm, rules);
  return {
    formatCode: resolved.billingFormat,
    surDevis: resolved.surDevis,
    reason: resolved.reason,
  };
}

export type TiragePhotoPriceResult = {
  calculable: boolean;
  surDevis: boolean;
  prixUnitaire: number;
  formula?: string;
  message?: string;
  breakdown?: {
    chosenLabel: string;
    formatUsed: string;
    prixBaseA4: number;
    prixUnitaire: number;
  };
};

export function computeTiragePhotoPrice(
  config: Record<string, unknown>,
  params: TiragePhotoParamLike = cachedParams,
): TiragePhotoPriceResult {
  const input = parseTiragePhotoFormatInput(config);
  let formatCode = input.formatCode;

  if (input.isCustom || !formatCode) {
    const resolved = resolveTiragePhotoFormat(input.widthMm, input.heightMm);
    if (resolved.surDevis || !resolved.formatCode) {
      return {
        calculable: false,
        surDevis: true,
        prixUnitaire: 0,
        formula: resolved.reason,
        message: 'Format hors standard — devis personnalisé',
      };
    }
    formatCode = resolved.formatCode;
  }

  const { price, formula, rule } = computePaperFormatPrice(
    params.prixBaseA4,
    formatCode,
    getImpressionSfFormatRules(),
  );
  if (!rule && formatCode !== 'A4') {
    const a4 = findPaperFormatRule('A4');
    if (!a4) {
      return { calculable: false, surDevis: true, prixUnitaire: 0, formula: 'format_inconnu' };
    }
  }

  const message = formatPhotoBillingMessage(input.chosenLabel, formatCode!);

  return {
    calculable: true,
    surDevis: false,
    prixUnitaire: price,
    formula: `tirage:${formula}`,
    message,
    breakdown: {
      chosenLabel: input.chosenLabel,
      formatUsed: formatCode!,
      prixBaseA4: params.prixBaseA4,
      prixUnitaire: price,
    },
  };
}
