/**
 * Moteur prix Photobook — page A4 Admin × ratio format ISF + supplément couverture.
 * Pas de frais de découpe ISF (formule métier : A5 = A4/2, A6 = A4/4…).
 * Formats commerciaux → équivalences photo.
 */
import { getImpressionSfFormatRules } from '@/lib/pricing/impression-sf-pricing';
import {
  findPaperFormatRule,
  type PaperFormatRuleLike,
} from '@/lib/pricing/paper-format-rules';
import {
  formatPhotoBillingMessage,
  resolvePhotoBillingFormat,
  resolvePhotoFormatFromLabel,
} from '@/lib/pricing/photo-format-equivalences';

export const PH_PHOTOBOOK_ID = 'ph-photobook';

export type PhotobookParamLike = {
  prixPageA4: number;
  softCoverSupplement: number;
  rigidCoverSupplement: number;
  leatherCoverSupplement: number;
  customCoverSupplement: number;
};

export const DEFAULT_PHOTOBOOK_PARAMS: PhotobookParamLike = {
  prixPageA4: 4000,
  softCoverSupplement: 0,
  rigidCoverSupplement: 20000,
  leatherCoverSupplement: 20000,
  customCoverSupplement: 20000,
};

let cachedParams: PhotobookParamLike = DEFAULT_PHOTOBOOK_PARAMS;

export function setPhotobookRuntimeParams(p: PhotobookParamLike | null) {
  if (p) cachedParams = p;
}

export function getPhotobookRuntimeParams(): PhotobookParamLike {
  return cachedParams;
}

export function isPhotobookArticleId(articleId: string): boolean {
  return articleId === PH_PHOTOBOOK_ID || articleId.startsWith('ph-photobook');
}

export function parsePhotobookPages(config: Record<string, unknown>): number {
  const raw = String(config.pages ?? config.nombre_pages ?? '20');
  if (/personnal/i.test(raw)) {
    const custom = Number(config.pages_custom ?? config.nombre_pages_custom);
    if (Number.isFinite(custom) && custom > 0) return Math.floor(custom);
  }
  const m = raw.match(/(\d+)/);
  return m ? Math.max(1, parseInt(m[1], 10)) : 20;
}

/** Convertit labels POS → mm + code format facturation. */
export function parsePhotobookFormatInput(config: Record<string, unknown>): {
  formatCode: string | null;
  widthMm: number;
  heightMm: number;
  isCustom: boolean;
  chosenLabel: string;
} {
  const raw = String(config.format ?? '');
  const isCustom = /personnalis/i.test(raw);
  if (isCustom) {
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

  return { formatCode: 'A4', widthMm: 210, heightMm: 297, isCustom: false, chosenLabel: raw || 'A4 — 210×297 mm' };
}

/**
 * Assimile formats commerciaux photo puis format supérieur PaperFormatRule.
 */
export function resolvePhotobookFormat(
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

export function resolveCoverSupplement(coverRaw: string, params: PhotobookParamLike): number {
  const v = String(coverRaw ?? '').toLowerCase();
  if (!v || v.includes('souple')) return params.softCoverSupplement;
  if (v.includes('cuir')) return params.leatherCoverSupplement;
  if (v.includes('personnal')) return params.customCoverSupplement;
  if (v.includes('rigide') || v.includes('tissu') || v.includes('photo')) {
    return params.rigidCoverSupplement;
  }
  return params.softCoverSupplement;
}

/** Prix/page Photobook = A4 × ratio (+ supplément format A3+ si défini). Sans découpe ISF. */
export function photobookPagePrice(
  prixPageA4: number,
  formatCode: string,
  rules: PaperFormatRuleLike[] = getImpressionSfFormatRules(),
): { prixPage: number; surDevis: boolean; formula: string } {
  const rule = findPaperFormatRule(formatCode, rules);
  if (!rule) {
    return { prixPage: 0, surDevis: true, formula: 'format_inconnu' };
  }
  const prixPage = Math.round(prixPageA4 * rule.ratioA4 + (rule.supplementAr || 0));
  return {
    prixPage,
    surDevis: false,
    formula: `A4×${rule.ratioA4}${rule.supplementAr ? `+suppl${rule.supplementAr}` : ''}`,
  };
}

export type PhotobookPriceResult = {
  calculable: boolean;
  surDevis: boolean;
  prixUnitaire: number;
  formula?: string;
  message?: string;
  breakdown?: {
    formatUsed: string;
    chosenLabel?: string;
    prixPage: number;
    pages: number;
    prixPages: number;
    coverSupplement: number;
  };
};

export function computePhotobookPrice(
  config: Record<string, unknown>,
  params: PhotobookParamLike = cachedParams,
): PhotobookPriceResult {
  const pages = parsePhotobookPages(config);
  const input = parsePhotobookFormatInput(config);
  let formatCode = input.formatCode;

  if (input.isCustom || !formatCode) {
    const resolved = resolvePhotobookFormat(input.widthMm, input.heightMm);
    if (resolved.surDevis || !resolved.formatCode) {
      return { calculable: false, surDevis: true, prixUnitaire: 0, formula: resolved.reason };
    }
    formatCode = resolved.formatCode;
  }

  const page = photobookPagePrice(params.prixPageA4, formatCode);
  if (page.surDevis) {
    return { calculable: false, surDevis: true, prixUnitaire: 0, formula: page.formula };
  }

  const prixPage = page.prixPage;
  const prixPages = Math.round(prixPage * pages);
  const coverSupplement = Math.round(
    resolveCoverSupplement(String(config.couverture ?? config.type_couverture ?? ''), params),
  );
  const prixUnitaire = prixPages + coverSupplement;

  return {
    calculable: true,
    surDevis: false,
    prixUnitaire,
    formula: `photobook:${formatCode}×${pages}+cover${coverSupplement}`,
    message: formatPhotoBillingMessage(input.chosenLabel, formatCode!),
    breakdown: {
      formatUsed: formatCode!,
      chosenLabel: input.chosenLabel,
      prixPage,
      pages,
      prixPages,
      coverSupplement,
    },
  };
}
