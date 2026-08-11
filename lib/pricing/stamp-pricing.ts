/**
 * Moteur prix Tampon — prix fixe par format Admin, perso → format supérieur.
 */
import { DOC_TAMPON_IDS } from '@/lib/pos/stamp-catalog';
import {
  DEFAULT_STAMP_FORMATS,
  findStampByLabel,
  parseStampFormatDims,
  resolveStampFormat,
  type StampFormatLike,
} from '@/lib/pricing/stamp-format-rules';

export type StampPriceResult = {
  calculable: boolean;
  surDevis: boolean;
  prixUnitaire: number;
  formula?: string;
  formatUsed?: string;
  message?: string;
};

let cachedFormats: StampFormatLike[] = DEFAULT_STAMP_FORMATS;

export function setStampFormatsRuntime(formats: StampFormatLike[]) {
  if (formats.length) cachedFormats = formats;
}

export function getStampFormatsRuntime(): StampFormatLike[] {
  return cachedFormats;
}

export function isStampArticleId(articleId: string): boolean {
  return DOC_TAMPON_IDS.has(articleId) || articleId === 'doc-tampon';
}

export function computeStampPrice(
  config: Record<string, unknown>,
  formats: StampFormatLike[] = cachedFormats,
): StampPriceResult {
  const formatRaw = String(config.format ?? '').trim();
  const stampType = String(config.type ?? '').trim();
  const isCustom = /personnalis/i.test(formatRaw);

  if (isCustom) {
    const w = Number(config.format_largeur) || Number(config.largeur_mm) || 0;
    const h = Number(config.format_hauteur) || Number(config.hauteur_mm) || 0;
    const resolved = resolveStampFormat(w, h, formats, stampType || undefined);
    if (resolved.surDevis) {
      return {
        calculable: false,
        surDevis: true,
        prixUnitaire: 0,
        formula: resolved.reason,
        message: resolved.message,
      };
    }
    return {
      calculable: true,
      surDevis: false,
      prixUnitaire: resolved.unitPrice,
      formatUsed: resolved.formatUsed ?? undefined,
      message: resolved.message,
      formula: `stamp:${resolved.formatUsed}`,
    };
  }

  const byLabel = findStampByLabel(formatRaw, formats);
  if (byLabel && byLabel.unitPrice > 0) {
    return {
      calculable: true,
      surDevis: false,
      prixUnitaire: byLabel.unitPrice,
      formatUsed: byLabel.formatLabel,
      formula: `stamp:${byLabel.formatLabel}`,
    };
  }

  const dims = parseStampFormatDims(formatRaw);
  if (dims) {
    const resolved = resolveStampFormat(dims.widthMm, dims.heightMm, formats, stampType || undefined);
    if (!resolved.surDevis) {
      return {
        calculable: true,
        surDevis: false,
        prixUnitaire: resolved.unitPrice,
        formatUsed: resolved.formatUsed ?? undefined,
        formula: `stamp:${resolved.formatUsed}`,
      };
    }
  }

  return {
    calculable: false,
    surDevis: true,
    prixUnitaire: 0,
    formula: 'stamp_format_inconnu',
    message: 'Format hors standard — devis personnalisé',
  };
}
