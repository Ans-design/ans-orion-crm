/**
 * Moteur Cadre photo = cadre vierge + tirage photo (moteur existant).
 */
import {
  DEFAULT_BLANK_FRAMES,
  findBlankFrameByLabel,
  parseCadreFormatDims,
  resolveBlankFrameFormat,
  type BlankFrameLike,
} from '@/lib/pricing/blank-frame-rules';
import {
  computeTiragePhotoPrice,
  getTiragePhotoRuntimeParams,
} from '@/lib/pricing/tirage-photo-pricing';

export const PH_CADRE_ID = 'ph-cadre';

export type CadrePhotoRuleLike = {
  usesTiragePhoto: boolean;
  optionalSupplement: number;
};

export const DEFAULT_CADRE_PHOTO_RULE: CadrePhotoRuleLike = {
  usesTiragePhoto: true,
  optionalSupplement: 0,
};

let cachedFrames: BlankFrameLike[] = DEFAULT_BLANK_FRAMES;
let cachedRule: CadrePhotoRuleLike = DEFAULT_CADRE_PHOTO_RULE;

export function setBlankFramesRuntime(frames: BlankFrameLike[]) {
  if (frames.length) cachedFrames = frames;
}

export function getBlankFramesRuntime(): BlankFrameLike[] {
  return cachedFrames;
}

export function setCadrePhotoRuleRuntime(rule: CadrePhotoRuleLike | null) {
  if (rule) cachedRule = rule;
}

export function getCadrePhotoRuleRuntime(): CadrePhotoRuleLike {
  return cachedRule;
}

export function isCadrePhotoArticleId(articleId: string): boolean {
  return articleId === PH_CADRE_ID || articleId.startsWith('ph-cadre');
}

/** Normalise type POS → type seed (Cadre bois, Cadre plastique…). */
export function normalizeFrameType(raw: string): string {
  const v = String(raw ?? '').trim();
  if (!v) return 'Cadre bois';
  if (/^cadre\s+/i.test(v)) return v;
  if (/plastique|pvc/i.test(v)) return 'Cadre plastique';
  if (/aluminium|alu/i.test(v)) return 'Cadre aluminium';
  if (/premium/i.test(v)) return 'Cadre premium';
  if (/bois/i.test(v)) return 'Cadre bois';
  if (/flottant|mural|bureau|simple/i.test(v)) return `Cadre ${v.replace(/^cadre\s+/i, '')}`;
  return `Cadre ${v}`;
}

export type CadrePhotoPriceResult = {
  calculable: boolean;
  surDevis: boolean;
  prixUnitaire: number;
  formula?: string;
  message?: string;
  breakdown?: {
    frameType: string;
    formatChosen: string;
    formatBilled: string;
    prixCadreVierge: number;
    prixTiragePhoto: number;
    tirageFormat: string;
    optionalSupplement: number;
    prixUnitaire: number;
  };
};

export function computeCadrePhotoPrice(
  config: Record<string, unknown>,
  frames: BlankFrameLike[] = cachedFrames,
  rule: CadrePhotoRuleLike = cachedRule,
): CadrePhotoPriceResult {
  const frameType = normalizeFrameType(String(config.type ?? config.type_cadre ?? 'Cadre bois'));
  const formatRaw = String(config.format ?? '').trim();
  const isCustom = /personnalis/i.test(formatRaw);

  let frame: BlankFrameLike | null = null;
  let formatBilled = formatRaw;
  let message: string | undefined;

  if (isCustom) {
    let w = Number(config.format_largeur) || Number(config.largeur_mm) || 0;
    let h = Number(config.format_hauteur) || Number(config.hauteur_mm) || 0;
    if (w > 0 && w < 80 && h > 0 && h < 80) {
      w *= 10;
      h *= 10;
    }
    const resolved = resolveBlankFrameFormat(w, h, frames, frameType);
    if (resolved.surDevis || !resolved.frame) {
      return {
        calculable: false,
        surDevis: true,
        prixUnitaire: 0,
        formula: resolved.reason,
        message: resolved.message,
      };
    }
    frame = resolved.frame;
    formatBilled = resolved.formatUsed!;
    message = resolved.message;
  } else {
    frame = findBlankFrameByLabel(formatRaw, frames, frameType);
    if (!frame) {
      const dims = parseCadreFormatDims(formatRaw);
      if (dims) {
        const resolved = resolveBlankFrameFormat(dims.widthMm, dims.heightMm, frames, frameType);
        if (!resolved.surDevis && resolved.frame) {
          frame = resolved.frame;
          formatBilled = resolved.formatUsed!;
          if (formatBilled !== formatRaw) {
            message = `Format facturé : ${formatBilled}`;
          }
        }
      }
    } else {
      formatBilled = frame.formatLabel;
    }
  }

  if (!frame || !(frame.unitPrice > 0)) {
    return {
      calculable: false,
      surDevis: true,
      prixUnitaire: 0,
      formula: 'cadre_vierge_introuvable',
      message: 'Format cadre hors standard — devis personnalisé',
    };
  }

  const prixCadreVierge = frame.unitPrice;
  let prixTiragePhoto = 0;
  let tirageFormat = formatBilled;

  if (rule.usesTiragePhoto !== false) {
    // Réutilise le moteur Tirage photo (même format facturé)
    const tirage = computeTiragePhotoPrice({
      format: formatBilled,
      matiere: config.matiere ?? config.papier ?? config.type_papier,
    });
    if (tirage.surDevis || !tirage.calculable) {
      return {
        calculable: false,
        surDevis: true,
        prixUnitaire: 0,
        formula: tirage.formula ?? 'tirage_sur_devis',
        message: tirage.message ?? 'Tirage photo hors standard — devis personnalisé',
      };
    }
    prixTiragePhoto = tirage.prixUnitaire;
    tirageFormat = tirage.breakdown?.formatUsed ?? formatBilled;
  }

  const optionalSupplement = Math.round(rule.optionalSupplement || 0);
  const prixUnitaire = Math.round(prixCadreVierge + prixTiragePhoto + optionalSupplement);

  return {
    calculable: true,
    surDevis: false,
    prixUnitaire,
    formula: `cadre:${prixCadreVierge}+tirage:${prixTiragePhoto}`,
    message,
    breakdown: {
      frameType,
      formatChosen: formatRaw || formatBilled,
      formatBilled,
      prixCadreVierge,
      prixTiragePhoto,
      tirageFormat,
      optionalSupplement,
      prixUnitaire,
    },
  };
}

/** Exposé pour tests / sync — params tirage courants. */
export function getLinkedTirageBaseA4(): number {
  return getTiragePhotoRuntimeParams().prixBaseA4;
}
