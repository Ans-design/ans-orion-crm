/**
 * Prix Flyer = Impression sans finition (ISF) + pliage (volets) − remise ISF.
 * Ne duplique pas la grille ISF — appelle computeImpressionSfPrice.
 */

import { isFlyerArticleId } from '@/lib/pos/flyer-catalog';
import {
  computeImpressionSfPrice,
  impressionSfFormatFactor,
  impressionSfVolumeRemiseAmount,
  impressionSfVolumeRemiseRate,
} from '@/lib/pricing/impression-sf-pricing';
import { FINITION_BASE_PRICES } from '@/lib/finition/finition-price-catalog';
import { formatFactor, RAINAGE_FORMATS } from '@/lib/finition/finition-formats';
import { getFlyerRuntimeParams } from '@/lib/pricing/flyer-pricing-rules';
import { resolveConfigFace } from '@/lib/pricing/config-normalize';
import { isStrictPosPricing } from '@/lib/pos/pos-price-policy';

export type FlyerPriceBreakdown = {
  calculable: boolean;
  surDevis: boolean;
  missingField?: string;
  prixImpressionUnitaire: number;
  prixPliageUnitaire: number;
  prixUnitaireAvantRemise: number;
  nombrePlis: number;
  formatCoeff: number;
  qty: number;
  sousTotal: number;
  remiseRate: number;
  remiseAmount: number;
  totalHT: number;
  prixUnitaire: number;
  formula: string;
  isfFormula?: string;
};

export function isFlyerPricingArticle(articleId: string, category?: string): boolean {
  return isFlyerArticleId(articleId, category);
}

/**
 * 1 volet → 0 pli ; 2 volets → 1 pli ; 3 → 2 ; …
 * Lit aussi « (N plis) » dans le libellé.
 */
export function flyerVoletsToPlis(voletsRaw: unknown): number {
  const s = String(voletsRaw ?? '').trim().toLowerCase();
  if (!s || /personnalis/.test(s)) return -1; // signal sur devis / à préciser
  const fromLabel = s.match(/(\d+)\s*plis?/);
  if (fromLabel) return Math.max(0, parseInt(fromLabel[1]!, 10));
  const n = s.match(/(\d+)\s*volets?/);
  if (n) {
    const volets = parseInt(n[1]!, 10);
    if (volets <= 1) return 0;
    return volets - 1;
  }
  if (/feuille\s*plate|1\s*volet/.test(s)) return 0;
  return 0;
}

/** Coefficient format pour pliage (A5=0.5, A4=1, A3=2) — aligné rainage + ISF. */
export function flyerPliageFormatCoefficient(formatRaw: unknown): number {
  const format = String(formatRaw ?? '').trim();
  if (!format) return 1;
  const rain = formatFactor(format, RAINAGE_FORMATS);
  if (rain !== 1 || /\bA[45]\b/i.test(format) || /\bA3\b/i.test(format)) {
    if (/\bA5\b/i.test(format)) return 0.5;
    if (/\bA3\+|\bSRA3\b/i.test(format)) return 2.2;
    if (/\bA3\b/i.test(format)) return 2;
    if (/\bA4\b/i.test(format)) return 1;
    if (rain !== 1) return rain;
  }
  // DL / A6 / B5 / etc. → facteur ISF papier
  return impressionSfFormatFactor({ format });
}

export function computeFlyerPliageUnitPrice(config: Record<string, unknown>): {
  plis: number;
  coeff: number;
  prixPliageUnitaire: number;
  surDevis: boolean;
} {
  const plis = flyerVoletsToPlis(config.volets);
  if (plis < 0) {
    return { plis: 0, coeff: 1, prixPliageUnitaire: 0, surDevis: true };
  }
  if (plis === 0) {
    return { plis: 0, coeff: flyerPliageFormatCoefficient(config.format), prixPliageUnitaire: 0, surDevis: false };
  }
  const coeff = flyerPliageFormatCoefficient(config.format);
  const params = getFlyerRuntimeParams();
  const prixPliA4 =
    params.prixPliA4 > 0
      ? params.prixPliA4
      : (isStrictPosPricing() ? 0 : FINITION_BASE_PRICES.rainagePerPliA4);
  if (isStrictPosPricing() && prixPliA4 <= 0 && plis > 0) {
    return { plis, coeff, prixPliageUnitaire: 0, surDevis: true };
  }
  const prixPliageUnitaire = Math.round(plis * prixPliA4 * coeff);
  return { plis, coeff, prixPliageUnitaire, surDevis: false };
}

/** Mappe la config Flyer vers les champs attendus par ISF. */
export function flyerConfigToIsfConfig(config: Record<string, unknown>): Record<string, unknown> {
  return {
    ...config,
    // Flyer = impression couleur standard sauf type explicitement saisi
    type: String(config.type ?? config.impression_type ?? 'Quadri').trim() || 'Quadri',
    matiere: config.matiere ?? config.material ?? config.support,
    grammage: config.grammage ?? config.paperWeight,
    format: config.format,
    face: resolveConfigFace(config),
    format_largeur: config.format_largeur ?? config.largeur_mm,
    format_hauteur: config.format_hauteur ?? config.hauteur_mm,
  };
}

export function computeFlyerPrice(
  config: Record<string, unknown>,
  qtyRaw = 1,
): FlyerPriceBreakdown {
  const qty = Math.max(1, Math.floor(Number(qtyRaw) || 1));
  const matiere = String(
    config.matiere ?? config.material ?? config.paperType ?? config.support ?? '',
  ).trim();
  const grammage = String(
    config.grammage ?? config.paperWeight ?? config.paper_weight ?? '',
  ).trim();
  const format = String(config.format ?? '').trim();
  const face = String(resolveConfigFace(config) ?? '').trim();

  if (!format) {
    return emptyBreakdown(qty, false, true, 'format');
  }
  if (!matiere) {
    return emptyBreakdown(qty, false, true, 'matiere');
  }
  if (!grammage || /personnalis/i.test(grammage)) {
    return emptyBreakdown(qty, /personnalis/i.test(grammage), true, 'grammage');
  }
  if (!face) {
    return emptyBreakdown(qty, false, true, 'face');
  }

  const pliage = computeFlyerPliageUnitPrice(config);
  if (pliage.surDevis) {
    return emptyBreakdown(qty, true, true, 'volets');
  }

  const isf = computeImpressionSfPrice(flyerConfigToIsfConfig(config), qty);
  if (!isf.calculable || isf.surDevis) {
    return {
      ...emptyBreakdown(qty, isf.surDevis, !isf.calculable, 'impression'),
      isfFormula: isf.formula,
      formula: isf.formula ?? 'isf_incomplete',
    };
  }

  const prixImpressionUnitaire = isf.prixUnitaire;
  const prixPliageUnitaire = pliage.prixPliageUnitaire;
  const prixUnitaireAvantRemise = prixImpressionUnitaire + prixPliageUnitaire;
  const sousTotal = prixUnitaireAvantRemise * qty;
  const usePalier = getFlyerRuntimeParams().utilisePalier === true;
  const remiseRate = usePalier ? impressionSfVolumeRemiseRate(qty) : 0;
  const remiseAmount = usePalier ? impressionSfVolumeRemiseAmount(sousTotal, qty) : 0;
  const totalHT = sousTotal - remiseAmount;
  // PU affiché après remise répartie (pour panier cohérent)
  const prixUnitaire = qty > 0 ? Math.round(totalHT / qty) : prixUnitaireAvantRemise;

  return {
    calculable: true,
    surDevis: false,
    prixImpressionUnitaire,
    prixPliageUnitaire,
    prixUnitaireAvantRemise,
    nombrePlis: pliage.plis,
    formatCoeff: pliage.coeff,
    qty,
    sousTotal,
    remiseRate,
    remiseAmount,
    totalHT,
    prixUnitaire,
    isfFormula: isf.formula,
    formula: `flyer:isf=${prixImpressionUnitaire}+pliage=${prixPliageUnitaire}(${pliage.plis}×${getFlyerRuntimeParams().prixPliA4}×${pliage.coeff})|${isf.formula ?? ''}`,
  };
}

function emptyBreakdown(
  qty: number,
  surDevis: boolean,
  incomplete: boolean,
  missingField?: string,
): FlyerPriceBreakdown {
  return {
    calculable: false,
    surDevis,
    missingField: incomplete ? missingField : undefined,
    prixImpressionUnitaire: 0,
    prixPliageUnitaire: 0,
    prixUnitaireAvantRemise: 0,
    nombrePlis: 0,
    formatCoeff: 1,
    qty,
    sousTotal: 0,
    remiseRate: 0,
    remiseAmount: 0,
    totalHT: 0,
    prixUnitaire: 0,
    formula: incomplete ? `missing:${missingField}` : 'sur_devis',
  };
}

export function flyerPriceSummaryNote(b: FlyerPriceBreakdown): string {
  if (!b.calculable) {
    if (b.missingField) return `Prix en attente — champ manquant : ${b.missingField}`;
    if (b.surDevis) return 'Prix en attente — option sur devis';
    return 'Prix en attente';
  }
  const parts = [
    `Impression : ${b.prixImpressionUnitaire.toLocaleString('fr-FR')} Ar / pièce`,
  ];
  if (b.prixPliageUnitaire > 0) {
    parts.push(
      `Pliage : ${b.prixPliageUnitaire.toLocaleString('fr-FR')} Ar / pièce (${b.nombrePlis} pli${b.nombrePlis > 1 ? 's' : ''})`,
    );
  } else {
    parts.push('Pliage : 0 Ar (1 volet)');
  }
  return parts.join(' · ');
}
