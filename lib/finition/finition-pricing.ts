/**
 * Moteur tarifaire central — articles Finitions & Reliures (fin-*).
 * Utilisé par calculate.ts, POS client fallback, Admin Prix lookup context.
 */

import {
  COLLAGE_FORMATS,
  DORURE_FORMATS,
  formatFactor,
  normalizeFormatId,
  PELLICULAGE_FORMATS,
  PLASTIFICATION_FORMATS,
  RAINAGE_FORMATS,
  VERNIS_FORMATS,
  type FinitionFormatDef,
} from '@/lib/finition/finition-formats';
import {
  computeSurfaceM2,
  isPoseGrandFormat,
} from '@/lib/finition/finition-field-policy';
import { parseCornerRounding } from '@/lib/finition/corner-rounding';
import { getEffectiveFinitionBasePrices } from '@/lib/finition/finition-price-catalog';
import { evaluateBinding } from '@/lib/print/binding-rules';
import { isRectoVerso } from '@/lib/pricing/config-normalize';
import { BINDING_LABELS } from '@/lib/data/binding-catalog';

export const STANDALONE_FINITION_IDS = new Set([
  'fin-pelliculage',
  'fin-vernis',
  'fin-rainage',
  'fin-plastification',
  'fin-collage',
  'fin-reliure',
  'fin-dorure',
  'fin-coins',
  'fin-autocollant',
  'fin-decoupe',
  'fin-perforation',
  'fin-couture',
  'fin-gaufrage',
  'fin-autres',
]);

/** Remises volume reliure (PRIX 2026). */
export const BINDING_QTY_DISCOUNTS = [
  { min: 1, max: 9, discount: 0 },
  { min: 10, max: 39, discount: 0.1 },
  { min: 40, max: 79, discount: 0.18 },
  { min: 80, max: 129, discount: 0.25 },
  { min: 130, max: 200, discount: 0.33 },
] as const;

export function isStandaloneFinitionArticle(articleId: string): boolean {
  return STANDALONE_FINITION_IDS.has(articleId);
}

function formatsForArticle(articleId: string): FinitionFormatDef[] {
  switch (articleId) {
    case 'fin-pelliculage':
      return PELLICULAGE_FORMATS;
    case 'fin-plastification':
      return PLASTIFICATION_FORMATS;
    case 'fin-dorure':
      return DORURE_FORMATS;
    case 'fin-vernis':
      return VERNIS_FORMATS;
    case 'fin-collage':
      return COLLAGE_FORMATS;
    case 'fin-rainage':
      return RAINAGE_FORMATS;
    default:
      return [];
  }
}

/** Extrait le format depuis dim (finitions) ou format (legacy). */
export function extractFinitionFormat(config: Record<string, unknown>): string {
  const raw = config.dim ?? config.format ?? config.dimension ?? '';
  return String(raw).trim();
}

export function getFinitionFormatFactor(articleId: string, config: Record<string, unknown>): number {
  const formats = formatsForArticle(articleId);
  if (!formats.length) return 1;
  const dim = extractFinitionFormat(config);
  if (!dim || /personnalis/i.test(dim)) return 1;
  return formatFactor(dim, formats);
}

/** Coefficient face — plastification inclut déjà 2 faces dans le tarif de base. */
export function getFinitionFaceCoefficient(articleId: string, config: Record<string, unknown>): number {
  if (articleId === 'fin-plastification') return 1;
  const face = String(config.face ?? '');
  if (articleId === 'fin-dorure' || articleId === 'fin-pelliculage' || articleId === 'fin-vernis') {
    if (/recto-verso|recto verso/i.test(face)) return 2;
    return 1;
  }
  return isRectoVerso(face) ? 2 : 1;
}

/** Plastification : pas de double majoration R/V (déjà 2 faces). */
export function shouldSkipRectoVersoMultiplier(
  articleId: string,
  config: Record<string, unknown>,
): boolean {
  if (articleId === 'fin-plastification') return true;
  if (articleId === 'gf-bache') return true;
  if (isStandaloneFinitionArticle(articleId)) {
    return true;
  }
  const face = String(config.face ?? '');
  if (/automatique/i.test(face)) return true;
  return false;
}

export function bindingQtyDiscountRate(qty: number): number {
  for (const tier of BINDING_QTY_DISCOUNTS) {
    if (qty >= tier.min && qty <= tier.max) return tier.discount;
  }
  return qty > 200 ? BINDING_QTY_DISCOUNTS[BINDING_QTY_DISCOUNTS.length - 1].discount : 0;
}

export function resolveDorureBasePrice(config: Record<string, unknown>, fallback: number): number {
  const complexite = String(config.complexite ?? config.zone ?? config.type_motif ?? '').toLowerCase();
  const P = getEffectiveFinitionBasePrices();
  if (/motif|fond/.test(complexite)) return P.dorureMotifA4;
  if (/logo/.test(complexite)) return P.dorureLogoA4;
  if (/texte|text/.test(complexite)) return P.dorureTexteA4;
  if (/standard/.test(complexite)) return P.dorureStandardA4;
  if (fallback > 0) return fallback;
  return P.dorureStandardA4;
}

export function resolveCollageBasePrice(config: Record<string, unknown>, fallback: number): number {
  const t = String(config.type ?? '').toLowerCase();
  const P = getEffectiveFinitionBasePrices();
  if (/contre/.test(t)) return P.collageContreA4;
  if (/simple/.test(t) || !t) return P.collageSimpleA4;
  if (fallback > 0) return fallback;
  return P.collageSimpleA4;
}

export function resolvePerforationBasePrice(config: Record<string, unknown>, fallback: number): number {
  const t = String(config.type ?? '').toLowerCase();
  const P = getEffectiveFinitionBasePrices();
  if (/pointill|carnet/.test(t)) return P.perforationPointilleA4;
  if (/4\s*trou/.test(t)) return P.perforation4;
  if (/2\s*trou/.test(t)) return P.perforation2;
  if (/1\s*trou/.test(t)) return P.perforation1;
  if (fallback > 0) return fallback;
  return P.perforation1;
}

export function resolveDecoupeUnitPrice(
  config: Record<string, unknown>,
  fallback: number,
): { unitPrice: number; mode: 'piece' | 'ml' | 'm2' | 'manual' } {
  const t = String(config.type ?? '').toLowerCase();
  const P = getEffectiveFinitionBasePrices();
  if (/personnalis/.test(t)) return { unitPrice: fallback > 0 ? fallback : 0, mode: 'manual' };
  if (/photobooth|plexi|acrylic|pvc/.test(t)) {
    return { unitPrice: P.decoupePhotoboothPerM2, mode: 'm2' };
  }
  if (/imprim|vinyl|vinyle/.test(t)) {
    return { unitPrice: P.decoupeAutocollantImprimePerM2, mode: 'm2' };
  }
  if (/autocollant\s*couleur|couleur/.test(t)) {
    return { unitPrice: P.decoupeAutocollantCouleurPerMl, mode: 'ml' };
  }
  if (/flex/.test(t)) return { unitPrice: P.decoupeFlexPerMl, mode: 'ml' };
  if (/droite|papier/.test(t) || !t) {
    return { unitPrice: P.decoupeDroitePapier, mode: 'piece' };
  }
  if (/mètre|metre|ml/i.test(String(config.unite_facture ?? ''))) {
    return { unitPrice: fallback > 0 ? fallback : P.decoupeFlexPerMl, mode: 'ml' };
  }
  if (/m²|m2/i.test(String(config.unite_facture ?? ''))) {
    return { unitPrice: fallback > 0 ? fallback : P.decoupeAutocollantImprimePerM2, mode: 'm2' };
  }
  return { unitPrice: fallback > 0 ? fallback : P.decoupeDroitePapier, mode: 'piece' };
}

function lengthMeters(config: Record<string, unknown>): number {
  const raw = parseFloat(String(config.longueur ?? config.longueur_pose ?? 0)) || 0;
  // Champs longueur en cm pour découpe ; en m pour pose
  if (raw > 50) return raw / 100;
  return raw;
}

function surfaceFromConfig(config: Record<string, unknown>): number | null {
  const l = parseFloat(String(config.longueur ?? config.longueur_pose ?? 0)) || 0;
  const w = parseFloat(String(config.largeur ?? config.largeur_pose ?? config.laize ?? 0)) || 0;
  if (l <= 0 || w <= 0) {
    const s = parseFloat(String(config.surface_m2 ?? config.surface ?? 0)) || 0;
    return s > 0 ? s : null;
  }
  // cm → m si valeurs typiques découpe
  if (l > 20 || w > 20) return computeSurfaceM2(l / 100, w / 100);
  return computeSurfaceM2(l, w);
}

export interface FinitionPriceAdjustments {
  formatFactor: number;
  faceCoefficient: number;
  cornerCount: number;
  bindingUnitPrice: number | null;
  surfaceM2: number | null;
  heightSurcharge: number;
  plisMultiplier: number;
  bindingDiscountRate: number;
  formula: string;
}

export function computeFinitionAdjustments(
  articleId: string,
  config: Record<string, unknown>,
  qty: number,
): FinitionPriceAdjustments {
  const formatFactor = getFinitionFormatFactor(articleId, config);
  const faceCoefficient = getFinitionFaceCoefficient(articleId, config);

  let cornerCount = 1;
  if (articleId === 'fin-coins') {
    const cr = parseCornerRounding(config.cornerRounding);
    cornerCount = Math.max(1, cr.selected.length || cr.limit || 1);
  }

  let bindingUnitPrice: number | null = null;
  let bindingDiscountRate = 0;
  if (articleId === 'fin-reliure') {
    const type = String(config.type ?? '');
    const ev = evaluateBinding(type, config);
    if (ev.priceAr) {
      // Remises volume reliure désactivées : prix référence Admin/catalogue exact
      bindingDiscountRate = 0;
      let price = ev.priceAr;
      if (
        type === BINDING_LABELS.DCC_COUSU ||
        type === BINDING_LABELS.RELIURE_COUSUE
      ) {
        price = Math.max(price + 5000, getEffectiveFinitionBasePrices().dccCousuMin);
      }
      bindingUnitPrice = Math.round(price);
    }
  }

  let surfaceM2: number | null = null;
  let heightSurcharge = 1;
  if (articleId === 'fin-autocollant' && isPoseGrandFormat(String(config.type ?? ''))) {
    const l = parseFloat(String(config.longueur_pose ?? 0)) || 0;
    const w = parseFloat(String(config.largeur_pose ?? 0)) || 0;
    if (l > 0 && w > 0) {
      surfaceM2 = computeSurfaceM2(l, w) * qty;
    }
    // Tarif absolu géré dans applyFinitionArticlePricing (10k / 20k) — pas de multi 1.35
    heightSurcharge = 1;
  }

  if (articleId === 'fin-couture') {
    surfaceM2 = surfaceFromConfig(config);
    if (surfaceM2 != null) surfaceM2 *= qty;
  }

  let plisMultiplier = 1;
  if (articleId === 'fin-rainage') {
    const m = String(config.plis ?? '').match(/(\d+)/);
    plisMultiplier = m ? Number(m[1]) : 1;
  }

  const parts: string[] = [];
  if (formatFactor !== 1) parts.push(`format×${formatFactor}`);
  if (faceCoefficient !== 1) parts.push(`face×${faceCoefficient}`);
  if (cornerCount > 1) parts.push(`coins×${cornerCount}`);
  if (bindingUnitPrice) parts.push(`reliure=${bindingUnitPrice}Ar`);
  if (surfaceM2) parts.push(`surface=${surfaceM2}m²`);
  if (plisMultiplier > 1) parts.push(`plis×${plisMultiplier}`);

  return {
    formatFactor,
    faceCoefficient,
    cornerCount,
    bindingUnitPrice,
    surfaceM2,
    heightSurcharge,
    plisMultiplier,
    bindingDiscountRate,
    formula: parts.length ? parts.join(' · ') : 'base',
  };
}

/**
 * Applique les ajustements finition sur le prix unitaire de base (A4 recto).
 * Retourne le nouveau prix unitaire arrondi.
 */
export function applyFinitionArticlePricing(
  articleId: string,
  baseUnitPrice: number,
  config: Record<string, unknown>,
  qty: number,
): { prixUnitaire: number; adjustments: FinitionPriceAdjustments } {
  const adj = computeFinitionAdjustments(articleId, config, qty);
  const P = getEffectiveFinitionBasePrices();

  if (articleId === 'fin-reliure' && adj.bindingUnitPrice != null) {
    // Prix catalogue reliure exact (sans remise volume générique POS)
    return { prixUnitaire: adj.bindingUnitPrice, adjustments: adj };
  }

  if (articleId === 'fin-autres') {
    const manual = parseFloat(String(config.prix_unitaire ?? baseUnitPrice ?? 0)) || 0;
    return { prixUnitaire: Math.round(manual), adjustments: { ...adj, formula: 'prix libre' } };
  }

  if (articleId === 'fin-coins') {
    const unit = P.coinsArrondisPerSheet;
    return {
      prixUnitaire: unit,
      adjustments: { ...adj, formula: `${unit} Ar/feuille` },
    };
  }

  if (articleId === 'fin-collage') {
    const base = resolveCollageBasePrice(config, baseUnitPrice);
    const unit = Math.round(base * adj.formatFactor);
    return {
      prixUnitaire: unit,
      adjustments: { ...adj, formula: `collage ${base}×${adj.formatFactor}` },
    };
  }

  if (articleId === 'fin-couture') {
    const t = String(config.type ?? '').toLowerCase();
    // PRIX 2026 — Couture oriflammes : forfait pièce (pas × m²)
    const unit = /renforc|maxi/.test(t) ? P.coutureRenforceePerM2 : P.coutureSimplePerM2;
    return {
      prixUnitaire: unit,
      adjustments: { ...adj, formula: `couture oriflamme forfait ${unit} Ar` },
    };
  }

  if (articleId === 'fin-decoupe') {
    const { unitPrice, mode } = resolveDecoupeUnitPrice(config, baseUnitPrice);
    if (mode === 'manual') {
      return { prixUnitaire: Math.round(unitPrice), adjustments: { ...adj, formula: 'manuel' } };
    }
    if (mode === 'ml') {
      const meters = lengthMeters(config) || 1;
      const total = Math.round(meters * unitPrice * qty);
      return {
        prixUnitaire: Math.round(total / Math.max(1, qty)),
        adjustments: { ...adj, formula: `${meters} m × ${unitPrice}` },
      };
    }
    if (mode === 'm2') {
      const s = surfaceFromConfig(config) ?? 1;
      const total = Math.round(s * unitPrice * qty);
      return {
        prixUnitaire: Math.round(total / Math.max(1, qty)),
        adjustments: { ...adj, surfaceM2: s * qty, formula: `${s} m² × ${unitPrice}` },
      };
    }
    return {
      prixUnitaire: unitPrice,
      adjustments: { ...adj, formula: `${unitPrice} Ar/pièce` },
    };
  }

  if (articleId === 'fin-dorure') {
    const base = resolveDorureBasePrice(config, baseUnitPrice);
    const unit = Math.round(base * adj.formatFactor * adj.faceCoefficient);
    return {
      prixUnitaire: unit,
      adjustments: {
        ...adj,
        formula: `dorure ${base}×${adj.formatFactor}×${adj.faceCoefficient}`,
      },
    };
  }

  if (articleId === 'fin-pelliculage') {
    const base = P.pelliculageA4Recto;
    const unit = Math.round(base * adj.formatFactor * adj.faceCoefficient);
    return { prixUnitaire: unit, adjustments: adj };
  }

  if (articleId === 'fin-gaufrage') {
    const base = P.gaufrageA4;
    const unit = Math.round(base * adj.formatFactor);
    return {
      prixUnitaire: unit,
      adjustments: { ...adj, faceCoefficient: 1, formula: `gaufrage ${base}×${adj.formatFactor}` },
    };
  }

  if (articleId === 'fin-plastification') {
    const base = P.plastificationA4;
    const unit = Math.round(base * adj.formatFactor);
    return {
      prixUnitaire: unit,
      adjustments: { ...adj, faceCoefficient: 1, formula: `plasti ${base}×${adj.formatFactor}` },
    };
  }

  if (articleId === 'fin-vernis') {
    const base = P.vernisA4Recto;
    const unit = Math.round(base * adj.formatFactor * adj.faceCoefficient);
    return { prixUnitaire: unit, adjustments: adj };
  }

  if (articleId === 'fin-perforation') {
    const base = resolvePerforationBasePrice(config, 0);
    return {
      prixUnitaire: base,
      adjustments: { ...adj, formula: `perf ${base} Ar` },
    };
  }

  if (articleId === 'fin-rainage') {
    const base = P.rainagePerPliA4;
    const unit = Math.round(base * adj.plisMultiplier * adj.formatFactor);
    return {
      prixUnitaire: unit,
      adjustments: {
        ...adj,
        formula: `${adj.plisMultiplier} pli(s) × ${base} × ${adj.formatFactor}`,
      },
    };
  }

  if (articleId === 'fin-autocollant') {
    const t = String(config.type ?? '');
    if (isPoseGrandFormat(t)) {
      const h = String(config.hauteur_pose ?? '');
      const prixM2 = /plus de 3|>\s*3/i.test(h)
        ? P.poseGrandFormatGt3m
        : P.poseGrandFormatLe3m;
      const l = parseFloat(String(config.longueur_pose ?? 0)) || 0;
      const w = parseFloat(String(config.largeur_pose ?? 0)) || 0;
      const s = l > 0 && w > 0 ? computeSurfaceM2(l, w) : 1;
      const total = Math.round(s * prixM2 * qty);
      return {
        prixUnitaire: Math.round(total / Math.max(1, qty)),
        adjustments: {
          ...adj,
          surfaceM2: s * qty,
          formula: `${s} m² × ${prixM2} Ar/m²`,
        },
      };
    }
    return {
      prixUnitaire: P.posePetitFormat,
      adjustments: { ...adj, formula: '300 Ar/pièce' },
    };
  }

  let price = baseUnitPrice;
  price *= adj.formatFactor;
  price *= adj.faceCoefficient;
  price *= adj.plisMultiplier;

  return { prixUnitaire: Math.round(price), adjustments: adj };
}

/** Contexte enrichi pour lookup Admin Prix / PRIX 2026. */
export function finitionPricingContext(
  articleId: string,
  config: Record<string, unknown>,
): Record<string, string | undefined> {
  return {
    format: extractFinitionFormat(config) || undefined,
    dim: normalizeFormatId(extractFinitionFormat(config)),
    face: String(config.face ?? '') || undefined,
    type: String(config.type ?? '') || undefined,
    complexite: String(config.complexite ?? '') || undefined,
    procede: String(config.procede ?? config.sous_type ?? '') || undefined,
    plis: String(config.plis ?? '') || undefined,
  };
}
