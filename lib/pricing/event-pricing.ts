/**
 * Moteur prix événementiel — division A4, promo ISF, badge, billet/vœux, hybrides.
 * Paramètres (marge, découpe, QR, %) et accessoires : Admin / Excel / runtime — pas figés POS.
 */
import {
  computePaperFormatPrice,
  findPaperFormatRule,
  resolvePaperFormatForCustomSize,
  type PaperFormatRuleLike,
} from '@/lib/pricing/paper-format-rules';
import {
  applyImpressionSfFormatPrice,
  computeImpressionSfPrice,
  getImpressionSfFormatRules,
} from '@/lib/pricing/impression-sf-pricing';
import {
  findEventAccessory,
  getEventAccessories,
  resolveAccessoryPrice,
} from '@/lib/pricing/event-accessories';
import { isFormatAllowedForMaterial } from '@/lib/pricing/material-format-limits';

/** Diviseurs A4 autorisés (billets / cartes de vœux). */
export const A4_DIVISORS = [20, 16, 12, 10, 8, 6, 4, 3] as const;

export type EventPricingParamsLike = {
  badgeMarginPct: number;
  badgeCutAr: number;
  ticketCutAr: number;
  ticketQrAr: number;
  promoDiscountPct: number;
};

export const DEFAULT_EVENT_PRICING_PARAMS: EventPricingParamsLike = {
  badgeMarginPct: 10,
  badgeCutAr: 50,
  ticketCutAr: 50,
  ticketQrAr: 50,
  promoDiscountPct: 40,
};

let cachedEventParams: EventPricingParamsLike = DEFAULT_EVENT_PRICING_PARAMS;

export function setEventPricingRuntimeParams(p: EventPricingParamsLike | null) {
  if (p) cachedEventParams = { ...DEFAULT_EVENT_PRICING_PARAMS, ...p };
  else cachedEventParams = { ...DEFAULT_EVENT_PRICING_PARAMS };
}

export function getEventPricingRuntimeParams(): EventPricingParamsLike {
  return cachedEventParams;
}

export type ArticlePromotionalRuleLike = {
  articleId: string;
  articleLabel?: string;
  materialFamily: string; // offset|pcm|pcb|all
  formatScope: string; // petit_format|all
  discountType: 'percent' | 'fixed';
  discountValue: number;
  priceSource: string; // impression_sf | grand_format
  active?: boolean;
};

export const DEFAULT_PROMO_RULES: ArticlePromotionalRuleLike[] = [
  {
    articleId: 'evt-affiche',
    articleLabel: 'Affiche événement',
    materialFamily: 'offset_pcm_pcb',
    formatScope: 'petit_format',
    discountType: 'percent',
    discountValue: 40,
    priceSource: 'impression_sf',
    active: true,
  },
  {
    articleId: 'cal-plateau',
    articleLabel: 'Calendrier plateau',
    materialFamily: 'offset_pcm_pcb',
    formatScope: 'petit_format',
    discountType: 'percent',
    discountValue: 40,
    priceSource: 'impression_sf',
    active: true,
  },
];

let cachedPromoRules: ArticlePromotionalRuleLike[] = DEFAULT_PROMO_RULES;

export function setPromotionalRulesRuntime(rows: ArticlePromotionalRuleLike[] | null) {
  cachedPromoRules = rows?.length ? rows : DEFAULT_PROMO_RULES;
}

export function getPromotionalRules(): ArticlePromotionalRuleLike[] {
  return cachedPromoRules.filter((r) => r.active !== false);
}

const A4_W = 210;
const A4_H = 297;

function normalizeDims(w: number, h: number): [number, number] {
  return w <= h ? [w, h] : [h, w];
}

export function countPiecesInA4(widthMm: number, heightMm: number): number {
  if (!(widthMm > 0) || !(heightMm > 0)) return 0;
  const [a, b] = normalizeDims(widthMm, heightMm);
  const fit1 = Math.floor(A4_W / a) * Math.floor(A4_H / b);
  const fit2 = Math.floor(A4_W / b) * Math.floor(A4_H / a);
  return Math.max(fit1, fit2, 0);
}

export function resolveA4Divisor(widthMm: number, heightMm: number): number {
  const pieces = countPiecesInA4(widthMm, heightMm);
  if (pieces <= 0) return 1;
  for (const d of A4_DIVISORS) {
    if (d <= pieces) return d;
  }
  return A4_DIVISORS[A4_DIVISORS.length - 1]!;
}

/**
 * Prix = prixA4 / diviseur + découpe (+ options).
 * Commun : Billet, Carte de vœux, petits supports similaires.
 */
export function computeA4DivisionPrice(input: {
  widthMm: number;
  heightMm: number;
  a4UnitPrice: number;
  cutAr?: number;
  extraAr?: number;
  divisorOverride?: number;
}): {
  prixUnitaire: number;
  divisor: number;
  baseFromA4: number;
  cutAr: number;
  formula: string;
} {
  const params = getEventPricingRuntimeParams();
  const divisor = input.divisorOverride ?? resolveA4Divisor(input.widthMm, input.heightMm);
  const cutAr = input.cutAr ?? params.ticketCutAr;
  const extraAr = input.extraAr ?? 0;
  const baseFromA4 = Math.round(input.a4UnitPrice / divisor);
  const prixUnitaire = Math.round(baseFromA4 + cutAr + extraAr);
  return {
    prixUnitaire,
    divisor,
    baseFromA4,
    cutAr,
    formula: `A4/${divisor}+découpe${cutAr}${extraAr ? `+extra${extraAr}` : ''}`,
  };
}

export function applyArticlePromotionalDiscount(
  basePrice: number,
  discountPct: number = getEventPricingRuntimeParams().promoDiscountPct,
): number {
  const pct = Math.max(0, Math.min(100, discountPct));
  return Math.round(basePrice * (1 - pct / 100));
}

export function isPromoPetitFormatMaterial(matiere: string): boolean {
  const m = matiere.toLowerCase();
  return (
    m.includes('offset')
    || m.includes('standard')
    || /\bpcm\b/.test(m)
    || /\bpcb\b/.test(m)
  );
}

/** Matières grand format pour affiche / chèque / photocall. */
export function isGrandFormatEventMaterial(matiere: string): boolean {
  const m = matiere.toLowerCase();
  return (
    m.includes('dos bleu')
    || m.includes('bache')
    || m.includes('bâche')
    || m.includes('plexig')
    || m.includes('acrylic')
    || m.includes('acrylique')
    || m.includes('pvc rigide')
    || m.includes('tissu polyester')
    || (m.includes('pvc') && (m.includes('mm') || m.includes('rigide') || m.includes('3mm') || m.includes('5mm')))
  );
}

export const PROMO_ISF_ARTICLE_IDS = new Set(['evt-affiche', 'cal-plateau']);

export function isPromoIsfArticleId(articleId: string): boolean {
  return PROMO_ISF_ARTICLE_IDS.has(articleId) || getPromotionalRules().some((r) => r.articleId === articleId);
}

export function findPromoRuleForArticle(articleId: string): ArticlePromotionalRuleLike | null {
  return getPromotionalRules().find((r) => r.articleId === articleId) ?? null;
}

/**
 * Badge : base = A4/ratio (sans découpe papier ISF) + marge % + découpe badge.
 * Ex. PVC A4 13000, ≈A7 → 13000/8 + 10% + 50.
 */
export function computeEventBadgePrice(input: {
  a4UnitPrice: number;
  widthMm: number;
  heightMm: number;
  formatCode?: string | null;
  marginPct?: number;
  cutAr?: number;
  paperRules?: PaperFormatRuleLike[];
}): {
  prixUnitaire: number;
  formatUsed: string;
  basePrice: number;
  marginAr: number;
  cutAr: number;
  formula: string;
} {
  const params = getEventPricingRuntimeParams();
  const rules = input.paperRules ?? getImpressionSfFormatRules();
  let formatUsed = input.formatCode ?? null;
  let ratio = 1 / 8;

  if (formatUsed) {
    const rule = findPaperFormatRule(formatUsed, rules);
    if (rule) ratio = rule.ratioA4;
  } else {
    const div = resolveA4Divisor(input.widthMm, input.heightMm);
    const map: Record<number, string> = { 20: 'A10', 16: 'A8', 12: 'A8', 10: 'A7', 8: 'A7', 6: 'A6', 4: 'A6', 3: 'DL' };
    formatUsed = map[div] ?? `A4/${div}`;
    const rule = findPaperFormatRule(formatUsed, rules);
    if (rule) ratio = rule.ratioA4;
    else ratio = 1 / div;
  }

  // Base pure (sans cutAr des règles papier — la découpe badge est séparée)
  const basePrice = Math.round(input.a4UnitPrice * ratio);
  const marginPct = input.marginPct ?? params.badgeMarginPct;
  const cutAr = input.cutAr ?? params.badgeCutAr;
  const marginAr = Math.round(basePrice * (marginPct / 100));
  const prixUnitaire = Math.round(basePrice + marginAr + cutAr);

  return {
    prixUnitaire,
    formatUsed: formatUsed ?? 'A7',
    basePrice,
    marginAr,
    cutAr,
    formula: `${basePrice}+marge${marginPct}%(${marginAr})+découpe${cutAr}`,
  };
}

export function isEventBadgeArticleId(articleId: string): boolean {
  return articleId === 'evt-badge' || articleId.startsWith('evt-badge');
}

export function isEventTicketArticleId(articleId: string): boolean {
  return articleId === 'evt-billet' || articleId === 'evt-carte-voeux';
}

export function isEventPricingArticleId(articleId: string): boolean {
  return (
    articleId.startsWith('evt-')
    || articleId === 'cal-plateau'
  );
}

export function parseEventDimsMm(config: Record<string, unknown>): { w: number; h: number } {
  let w = Number(config.format_largeur) || Number(config.largeur_mm) || Number(config.largeur_cm) * 10 || 0;
  let h = Number(config.format_hauteur) || Number(config.hauteur_mm) || Number(config.hauteur_cm) * 10 || 0;
  const raw = String(config.format ?? '');
  const m = raw.match(/(\d+)\s*[x×]\s*(\d+)/i);
  if ((!w || !h) && m) {
    w = parseInt(m[1]!, 10);
    h = parseInt(m[2]!, 10);
    // Unité explicite cm → mm
    if (/\bcm\b/i.test(raw) && !/\bmm\b/i.test(raw)) {
      w *= 10;
      h *= 10;
    } else if (/\bm\b/i.test(raw) && !/\bcm\b/i.test(raw) && !/\bmm\b/i.test(raw)) {
      w *= 1000;
      h *= 1000;
    } else if (w < 80 && h < 80 && !/mm/i.test(raw)) {
      // Valeurs < 80 sans unité mm → probablement cm
      w *= 10;
      h *= 10;
    }
  }
  if (!w || !h) {
    if (/A7/i.test(raw)) return { w: 74, h: 105 };
    if (/A6/i.test(raw)) return { w: 105, h: 148 };
    if (/A5/i.test(raw)) return { w: 148, h: 210 };
    if (/A4/i.test(raw)) return { w: 210, h: 297 };
    if (/A3\+/i.test(raw)) return { w: 320, h: 450 };
    if (/A3/i.test(raw)) return { w: 297, h: 420 };
    if (/A2/i.test(raw)) return { w: 420, h: 594 };
    if (/A1/i.test(raw)) return { w: 594, h: 841 };
    if (/A0/i.test(raw)) return { w: 841, h: 1189 };
    return { w: 100, h: 70 };
  }
  return { w, h };
}

export function hasTicketQr(config: Record<string, unknown>): boolean {
  const v = String(config.numerotation ?? config.qr ?? config.option_qr ?? '').toLowerCase();
  return /qr|oui|avec|activ/.test(v);
}

/** Chèque cadeau : pas d’Offset / papiers fins ≤ 250g. */
export function isGiftCardMaterialAllowed(matiere: string, grammage?: string): {
  allowed: boolean;
  reason?: string;
} {
  const m = matiere.toLowerCase();
  if (m.includes('offset') || m.includes('standard')) {
    return { allowed: false, reason: 'Offset non autorisé pour Chèque cadeau (papier trop fin)' };
  }
  if (isGrandFormatEventMaterial(matiere) || m.includes('pvc') || m.includes('plexig') || m.includes('acryl')) {
    return { allowed: true };
  }
  const g = parseInt(String(grammage ?? '').replace(/\D/g, ''), 10);
  if (Number.isFinite(g) && g > 0 && g <= 250) {
    return { allowed: false, reason: 'Grammage papier ≤ 250G non autorisé pour Chèque cadeau' };
  }
  // Glossy 170g etc. — si grammage connu ≤250 bloqué ; si >250 OK
  if (Number.isFinite(g) && g > 250) return { allowed: true };
  // PCB/PCM/Glossy/spéciaux sans grammage : laisser choisir (POS filtrera options)
  if (/\bpcb\b|\bpcm\b|glossy|invitation|spécial|kraft|bristol/.test(m)) return { allowed: true };
  return { allowed: true };
}

export type EventPriceResult = {
  calculable: boolean;
  surDevis: boolean;
  prixUnitaire: number;
  formula?: string;
  priceSource?: string;
};

/**
 * Résout le prix A4 ISF pour une matière (via moteur ISF existant, format forcé A4).
 */
export function resolveIsfA4UnitPrice(config: Record<string, unknown>, qty = 1): number {
  const a4Config = { ...config, format: 'A4' };
  const r = computeImpressionSfPrice(a4Config, qty);
  return r.calculable ? r.prixUnitaire : 0;
}

/**
 * Prix ISF format courant (sans promo).
 */
export function resolveIsfFormatUnitPrice(config: Record<string, unknown>, qty = 1): number {
  const r = computeImpressionSfPrice(config, qty);
  return r.calculable ? r.prixUnitaire : 0;
}

function applyPromoIfEligible(
  articleId: string,
  matiere: string,
  basePrice: number,
): { price: number; applied: boolean; pct: number } {
  const rule = findPromoRuleForArticle(articleId);
  if (!rule || !isPromoPetitFormatMaterial(matiere)) {
    return { price: basePrice, applied: false, pct: 0 };
  }
  if (rule.discountType === 'percent') {
    return {
      price: applyArticlePromotionalDiscount(basePrice, rule.discountValue),
      applied: true,
      pct: rule.discountValue,
    };
  }
  return {
    price: Math.max(0, Math.round(basePrice - rule.discountValue)),
    applied: true,
    pct: 0,
  };
}

/**
 * Moteur principal articles événementiels + calendrier plateau.
 */
export function computeEventArticlePrice(
  articleId: string,
  config: Record<string, unknown>,
  qty = 1,
): EventPriceResult {
  if (!isEventPricingArticleId(articleId)) {
    return { calculable: false, surDevis: false, prixUnitaire: 0 };
  }

  const matiere = String(config.matiere ?? config.support ?? '').trim();
  const grammage = String(config.grammage ?? '').trim();
  const dims = parseEventDimsMm(config);
  const params = getEventPricingRuntimeParams();

  // Limite format × matière
  if (matiere && config.format) {
    const check = isFormatAllowedForMaterial(matiere, String(config.format), dims.w, dims.h);
    if (!check.allowed) {
      return { calculable: false, surDevis: true, prixUnitaire: 0, formula: check.reason };
    }
  }

  // ── Affiche événement / Calendrier plateau ──
  if (articleId === 'evt-affiche' || articleId === 'cal-plateau') {
    if (isGrandFormatEventMaterial(matiere)) {
      return { calculable: false, surDevis: false, prixUnitaire: 0, formula: 'delegate_grand_format' };
    }
    const isf = resolveIsfFormatUnitPrice(config, qty);
    if (isf <= 0) {
      return { calculable: false, surDevis: true, prixUnitaire: 0, formula: 'isf_missing' };
    }
    const promo = applyPromoIfEligible(articleId, matiere, isf);
    return {
      calculable: true,
      surDevis: false,
      prixUnitaire: promo.price,
      formula: promo.applied ? `isf${isf}-promo${promo.pct}%` : `isf${isf}`,
      priceSource: 'eventPromoIsf',
    };
  }

  // ── Badge ──
  if (isEventBadgeArticleId(articleId)) {
    const a4 = resolveIsfA4UnitPrice(
      { ...config, matiere: matiere || 'PVC opaque', format: 'A4' },
      qty,
    );
    if (a4 <= 0) {
      return { calculable: false, surDevis: true, prixUnitaire: 0, formula: 'badge_a4_missing' };
    }
    const badge = computeEventBadgePrice({
      a4UnitPrice: a4,
      widthMm: dims.w,
      heightMm: dims.h,
      formatCode: /A\d/i.test(String(config.format ?? '')) ? String(config.format) : null,
    });
    return {
      calculable: true,
      surDevis: false,
      prixUnitaire: badge.prixUnitaire,
      formula: badge.formula,
      priceSource: 'eventBadgeTarif',
    };
  }

  // ── Billet / Carte de vœux ──
  if (isEventTicketArticleId(articleId)) {
    const a4 = resolveIsfA4UnitPrice(config, qty);
    if (a4 <= 0) {
      return { calculable: false, surDevis: true, prixUnitaire: 0, formula: 'ticket_a4_missing' };
    }
    const qrAr = hasTicketQr(config) ? params.ticketQrAr : 0;
    const ticket = computeA4DivisionPrice({
      widthMm: dims.w,
      heightMm: dims.h,
      a4UnitPrice: a4,
      cutAr: params.ticketCutAr,
      extraAr: qrAr,
    });
    return {
      calculable: true,
      surDevis: false,
      prixUnitaire: ticket.prixUnitaire,
      formula: ticket.formula,
      priceSource: 'eventTicketTarif',
    };
  }

  // ── Bracelet ──
  if (articleId === 'evt-bracelet') {
    const typeLabel = String(config.type ?? '');
    const techLabel = String(config.technique ?? '');
    const typePrice = resolveAccessoryPrice('bracelet_type', typeLabel, 0);
    const techPrice = resolveAccessoryPrice('bracelet_technique', techLabel, 0);
    if (typePrice <= 0 && techPrice <= 0) {
      return { calculable: false, surDevis: true, prixUnitaire: 0, formula: 'bracelet_prices_missing' };
    }
    return {
      calculable: true,
      surDevis: false,
      prixUnitaire: Math.round(typePrice + techPrice),
      formula: `bracelet${typePrice}+tech${techPrice}`,
      priceSource: 'eventBraceletTarif',
    };
  }

  // ── Cordon / Lanyard — technique sans impact ──
  if (articleId === 'evt-cordon') {
    const typeLabel = String(config.type ?? '');
    const largeur = String(config.largeur ?? '');
    const key = `${typeLabel}|${largeur}`;
    let price = resolveAccessoryPrice('lanyard', key, 0);
    if (price <= 0) price = resolveAccessoryPrice('lanyard', typeLabel, 0);
    if (price <= 0) {
      return { calculable: false, surDevis: true, prixUnitaire: 0, formula: 'lanyard_price_missing' };
    }
    return {
      calculable: true,
      surDevis: false,
      prixUnitaire: price,
      formula: `lanyard:${typeLabel}|${largeur}`,
      priceSource: 'eventLanyardTarif',
    };
  }

  // ── Chèque cadeau ──
  if (articleId === 'evt-cheque') {
    const allowed = isGiftCardMaterialAllowed(matiere, grammage);
    if (!allowed.allowed) {
      return { calculable: false, surDevis: true, prixUnitaire: 0, formula: allowed.reason };
    }
    if (isGrandFormatEventMaterial(matiere) || /plexig|acryl|pvc/i.test(matiere)) {
      return { calculable: false, surDevis: false, prixUnitaire: 0, formula: 'delegate_grand_format' };
    }
    const isf = resolveIsfFormatUnitPrice(config, qty);
    if (isf <= 0) {
      return { calculable: false, surDevis: true, prixUnitaire: 0, formula: 'cheque_isf_missing' };
    }
    return {
      calculable: true,
      surDevis: false,
      prixUnitaire: isf,
      formula: `cheque_isf${isf}`,
      priceSource: 'eventChequeIsf',
    };
  }

  // ── Enveloppe ──
  if (articleId === 'evt-enveloppe') {
    const formatEnv = String(config.format ?? config.type ?? 'C5');
    const blank = findEventAccessory('envelope_blank', `${formatEnv}|${matiere}`)
      ?? findEventAccessory('envelope_blank', formatEnv)
      ?? findEventAccessory('envelope_blank', matiere);
    const blankPrice = blank?.priceAr ?? 0;
    const printA4 = resolveAccessoryPrice('event_param', 'envelope_offset_a4_print', 400);
    const fermeture = String(config.fermeture ?? '');
    const closurePrice = fermeture
      ? resolveAccessoryPrice('envelope_closure', fermeture, 0)
      : 0;
    if (blankPrice <= 0) {
      return { calculable: false, surDevis: true, prixUnitaire: 0, formula: 'envelope_blank_missing' };
    }
    return {
      calculable: true,
      surDevis: false,
      prixUnitaire: Math.round(blankPrice + printA4 + closurePrice),
      formula: `vierge${blankPrice}+offsetA4${printA4}+ferm${closurePrice}`,
      priceSource: 'eventEnvelopeTarif',
    };
  }

  // ── Fanion ──
  if (articleId === 'evt-fanion') {
    const isf = resolveIsfFormatUnitPrice(config, qty);
    const tige = resolveAccessoryPrice('fanion_accessory', 'tige', 100);
    const labor = resolveAccessoryPrice('fanion_labor', 'colle_finition', 300);
    if (isf <= 0) {
      // Essayer division A4 si format petit
      const a4 = resolveIsfA4UnitPrice(config, qty);
      if (a4 > 0) {
        const div = computeA4DivisionPrice({
          widthMm: dims.w,
          heightMm: dims.h,
          a4UnitPrice: a4,
          cutAr: 0,
        });
        return {
          calculable: true,
          surDevis: false,
          prixUnitaire: Math.round(div.baseFromA4 + tige + labor),
          formula: `imp${div.baseFromA4}+tige${tige}+mo${labor}`,
          priceSource: 'eventFanionTarif',
        };
      }
      return { calculable: false, surDevis: true, prixUnitaire: 0, formula: 'fanion_isf_missing' };
    }
    return {
      calculable: true,
      surDevis: false,
      prixUnitaire: Math.round(isf + tige + labor),
      formula: `imp${isf}+tige${tige}+mo${labor}`,
      priceSource: 'eventFanionTarif',
    };
  }

  // ── Photobooth ──
  if (articleId === 'evt-photobooth') {
    const wM = dims.w / 1000;
    const hM = dims.h / 1000;
    const surface = wM * hM;
    if (!(surface > 0)) {
      return { calculable: false, surDevis: true, prixUnitaire: 0, formula: 'photobooth_dims' };
    }
    // Prix m² matière : via config.prix_m2 ou accessoire ; sinon sur devis (GF sync)
    const prixM2 = Number(config.prix_m2) || Number(config.prixM2) || 0;
    const cutType = String(config.decoupe ?? config.type_decoupe ?? 'simple');
    const cutM2 = /personnal/i.test(cutType)
      ? resolveAccessoryPrice('photobooth_cut', 'personnalisee', 50000)
      : resolveAccessoryPrice('photobooth_cut', 'simple', 0);
    if (prixM2 <= 0) {
      return { calculable: false, surDevis: false, prixUnitaire: 0, formula: 'delegate_grand_format' };
    }
    const total = Math.round(surface * prixM2 + surface * cutM2);
    return {
      calculable: total > 0,
      surDevis: false,
      prixUnitaire: total,
      formula: `${surface.toFixed(2)}m²×(${prixM2}+cut${cutM2})`,
      priceSource: 'eventPhotoboothTarif',
    };
  }

  // ── Photocall ──
  if (articleId === 'evt-photocall') {
    const structure = getEventAccessories('photocall_structure').find((s) => {
      if (s.widthMm && s.heightMm) {
        return Math.abs(s.widthMm - dims.w) < 50 && Math.abs(s.heightMm - dims.h) < 50;
      }
      return normLabel(s.label).includes(normLabel(String(config.type ?? '')));
    });
    const structurePrice = structure?.priceAr
      ?? resolveAccessoryPrice('photocall_structure', String(config.type ?? ''), 0);
    const prixM2 = Number(config.prix_m2) || Number(config.prixM2) || 0;
    const surface = (dims.w / 1000) * (dims.h / 1000);
    if (structurePrice <= 0) {
      return { calculable: false, surDevis: true, prixUnitaire: 0, formula: 'photocall_structure_missing' };
    }
    if (prixM2 <= 0) {
      // Structure seule si impression déléguée GF plus tard
      return {
        calculable: true,
        surDevis: false,
        prixUnitaire: structurePrice,
        formula: `structure${structurePrice}+impression_pending`,
        priceSource: 'eventPhotocallTarif',
      };
    }
    const printPrice = Math.round(surface * prixM2);
    return {
      calculable: true,
      surDevis: false,
      prixUnitaire: Math.round(structurePrice + printPrice),
      formula: `structure${structurePrice}+imp${printPrice}`,
      priceSource: 'eventPhotocallTarif',
    };
  }

  // ── Comptoir ──
  if (articleId === 'evt-comptoir') {
    const blank = getEventAccessories('comptoir_blank').find((s) => {
      if (s.widthMm && s.heightMm) {
        return Math.abs(s.widthMm - dims.w) < 50 && Math.abs(s.heightMm - dims.h) < 50;
      }
      return normLabel(s.label).includes(normLabel(String(config.type ?? config.modele ?? '')));
    });
    const blankPrice = blank?.priceAr
      ?? resolveAccessoryPrice('comptoir_blank', String(config.type ?? ''), 0);
    const prixM2 = Number(config.prix_m2) || Number(config.prixM2) || 0;
    const surface = (dims.w / 1000) * (dims.h / 1000);
    if (blankPrice <= 0) {
      return { calculable: false, surDevis: true, prixUnitaire: 0, formula: 'comptoir_blank_missing' };
    }
    const printPrice = prixM2 > 0 ? Math.round(surface * prixM2) : 0;
    return {
      calculable: true,
      surDevis: false,
      prixUnitaire: Math.round(blankPrice + printPrice),
      formula: `comptoir${blankPrice}+imp${printPrice}`,
      priceSource: 'eventComptoirTarif',
    };
  }

  // ── Pochette à rabat : ×3 format fini + MO + pelliculage×3 ──
  if (articleId === 'evt-pochette') {
    const isf = resolveIsfFormatUnitPrice(config, qty);
    const mult = resolveAccessoryPrice('event_param', 'pochette_format_multiplier', 3) || 3;
    const typeLabel = String(config.type ?? config.type_pochette ?? 'Rabat luxe dos carré');
    const labor = resolveAccessoryPrice('pochette_type', typeLabel, 2000);
    const pelliculageUnit = Number(config.pelliculage_prix) || 0;
    const hasPelliculage = /pellicul|mat|brillant/i.test(String(config.pelliculage ?? config.finition ?? ''));
    if (isf <= 0) {
      return { calculable: false, surDevis: true, prixUnitaire: 0, formula: 'pochette_isf_missing' };
    }
    const printTotal = Math.round(isf * mult);
    const pellTotal = hasPelliculage ? Math.round(pelliculageUnit * mult) : 0;
    return {
      calculable: true,
      surDevis: false,
      prixUnitaire: Math.round(printTotal + labor + pellTotal),
      formula: `isf${isf}×${mult}+mo${labor}+pell${pellTotal}`,
      priceSource: 'eventPochetteTarif',
    };
  }

  return { calculable: false, surDevis: false, prixUnitaire: 0 };
}

function normLabel(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim();
}

/** Exposé pour tests / Admin preview. */
export { applyImpressionSfFormatPrice, resolvePaperFormatForCustomSize };
