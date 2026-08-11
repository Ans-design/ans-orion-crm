/**
 * Sync runtime règles prix événementiel + limites formats + promo + accessoires.
 */
import { prisma } from '@/lib/prisma';
import {
  DEFAULT_EVENT_PRICING_PARAMS,
  DEFAULT_PROMO_RULES,
  setEventPricingRuntimeParams,
  setPromotionalRulesRuntime,
  type ArticlePromotionalRuleLike,
} from '@/lib/pricing/event-pricing';
import {
  DEFAULT_EVENT_ACCESSORIES,
  setEventAccessoryRuntime,
  type EventAccessoryLike,
  type EventAccessoryKind,
} from '@/lib/pricing/event-accessories';
import {
  DEFAULT_MATERIAL_FORMAT_LIMITS,
  setMaterialFormatLimitsRuntime,
  type MaterialFormatLimitLike,
} from '@/lib/pricing/material-format-limits';

let readyPromise: Promise<void> | null = null;

function hasDelegate(name: string): boolean {
  return typeof (prisma as unknown as Record<string, unknown>)[name] === 'object'
    && (prisma as unknown as Record<string, unknown>)[name] != null;
}

export async function ensureEventPricingSeeded() {
  // Promo rules
  if (hasDelegate('articlePromotionalRule')) {
    const count = await prisma.articlePromotionalRule.count();
    if (count === 0) {
      await prisma.articlePromotionalRule.createMany({
        data: DEFAULT_PROMO_RULES.map((r, i) => ({
          excelId: `PROMO${String(i + 1).padStart(3, '0')}`,
          articleId: r.articleId,
          articleLabel: r.articleLabel ?? r.articleId,
          materialFamily: r.materialFamily,
          formatScope: r.formatScope,
          discountType: r.discountType,
          discountValue: r.discountValue,
          priceSource: r.priceSource,
          active: true,
          sortOrder: i,
        })),
      });
    }
  }

  // Format limits
  if (hasDelegate('materialFormatLimit')) {
    const count = await prisma.materialFormatLimit.count();
    if (count === 0) {
      await prisma.materialFormatLimit.createMany({
        data: DEFAULT_MATERIAL_FORMAT_LIMITS.map((r, i) => ({
          excelId: `LIM${String(i + 1).padStart(3, '0')}`,
          materialKey: r.materialKey,
          materialLabel: r.materialLabel,
          formatMax: r.formatMax,
          widthMaxMm: r.widthMaxMm,
          heightMaxMm: r.heightMaxMm,
          unit: r.unit,
          messagePos: r.messagePos,
          details: r.details ?? null,
          active: true,
          sortOrder: i,
        })),
      });
    }
  }

  // Accessories
  if (hasDelegate('eventAccessoryPrice')) {
    const count = await prisma.eventAccessoryPrice.count();
    if (count === 0) {
      await prisma.eventAccessoryPrice.createMany({
        data: DEFAULT_EVENT_ACCESSORIES.map((r, i) => ({
          excelId: `EVT${String(i + 1).padStart(3, '0')}`,
          kind: r.kind,
          code: r.code,
          label: r.label,
          priceAr: r.priceAr,
          unit: r.unit ?? 'pièce',
          widthMm: r.widthMm ?? null,
          heightMm: r.heightMm ?? null,
          material: r.material ?? null,
          active: true,
          visiblePOS: r.visiblePOS !== false,
          details: r.details ?? null,
          sortOrder: i,
        })),
      });
    }
  }

  // Params
  if (hasDelegate('eventPricingParam')) {
    const existing = await prisma.eventPricingParam.findFirst({ where: { code: 'default' } });
    if (!existing) {
      await prisma.eventPricingParam.create({
        data: {
          code: 'default',
          label: 'Paramètres événementiel',
          badgeMarginPct: DEFAULT_EVENT_PRICING_PARAMS.badgeMarginPct,
          badgeCutAr: DEFAULT_EVENT_PRICING_PARAMS.badgeCutAr,
          ticketCutAr: DEFAULT_EVENT_PRICING_PARAMS.ticketCutAr,
          ticketQrAr: DEFAULT_EVENT_PRICING_PARAMS.ticketQrAr,
          promoDiscountPct: DEFAULT_EVENT_PRICING_PARAMS.promoDiscountPct,
          active: true,
        },
      });
    }
  }
}

async function loadRuntimeFromDb() {
  try {
    await ensureEventPricingSeeded();
  } catch {
    // Tables absentes tant que prisma db push n’a pas tourné — seeds mémoire OK
  }

  try {
    if (hasDelegate('articlePromotionalRule')) {
      const rows = await prisma.articlePromotionalRule.findMany({ where: { active: true } });
      if (rows.length) {
        setPromotionalRulesRuntime(rows.map((r): ArticlePromotionalRuleLike => ({
          articleId: r.articleId,
          articleLabel: r.articleLabel ?? undefined,
          materialFamily: r.materialFamily,
          formatScope: r.formatScope,
          discountType: r.discountType === 'fixed' ? 'fixed' : 'percent',
          discountValue: Number(r.discountValue) || 0,
          priceSource: r.priceSource,
          active: r.active,
        })));
      }
    }
  } catch { /* keep defaults */ }

  try {
    if (hasDelegate('materialFormatLimit')) {
      const rows = await prisma.materialFormatLimit.findMany({ where: { active: true } });
      if (rows.length) {
        setMaterialFormatLimitsRuntime(rows.map((r): MaterialFormatLimitLike => ({
          materialKey: r.materialKey,
          materialLabel: r.materialLabel,
          formatMax: r.formatMax,
          widthMaxMm: r.widthMaxMm,
          heightMaxMm: r.heightMaxMm,
          unit: r.unit === 'cm' ? 'cm' : 'mm',
          messagePos: r.messagePos,
          active: r.active,
          details: r.details,
        })));
      }
    }
  } catch { /* keep defaults */ }

  try {
    if (hasDelegate('eventAccessoryPrice')) {
      const rows = await prisma.eventAccessoryPrice.findMany({ where: { active: true } });
      if (rows.length) {
        setEventAccessoryRuntime(rows.map((r): EventAccessoryLike => ({
          kind: r.kind as EventAccessoryKind,
          code: r.code,
          label: r.label,
          priceAr: Number(r.priceAr) || 0,
          unit: r.unit,
          widthMm: r.widthMm,
          heightMm: r.heightMm,
          material: r.material,
          active: r.active,
          visiblePOS: r.visiblePOS,
          details: r.details,
        })));
      }
    }
  } catch { /* keep defaults */ }

  try {
    if (hasDelegate('eventPricingParam')) {
      const p = await prisma.eventPricingParam.findFirst({ where: { code: 'default', active: true } });
      if (p) {
        setEventPricingRuntimeParams({
          badgeMarginPct: Number(p.badgeMarginPct) || DEFAULT_EVENT_PRICING_PARAMS.badgeMarginPct,
          badgeCutAr: Number(p.badgeCutAr) || DEFAULT_EVENT_PRICING_PARAMS.badgeCutAr,
          ticketCutAr: Number(p.ticketCutAr) || DEFAULT_EVENT_PRICING_PARAMS.ticketCutAr,
          ticketQrAr: Number(p.ticketQrAr) || DEFAULT_EVENT_PRICING_PARAMS.ticketQrAr,
          promoDiscountPct: Number(p.promoDiscountPct) || DEFAULT_EVENT_PRICING_PARAMS.promoDiscountPct,
        });
      }
    }
  } catch { /* keep defaults */ }
}

export async function ensureEventPricingRuntimeReady() {
  if (!readyPromise) {
    readyPromise = loadRuntimeFromDb().finally(() => {
      // allow refresh after Admin import
    });
  }
  await readyPromise;
}

export function invalidateEventPricingRuntime() {
  readyPromise = null;
  setEventPricingRuntimeParams(null);
  setPromotionalRulesRuntime(null);
  setEventAccessoryRuntime(null);
  setMaterialFormatLimitsRuntime(null);
}

/** API sync demandée — recalcul / invalidation cache POS. */
export async function syncMaterialEquivalences() {
  const { ensureImpressionSfRuntimeReady } = await import('@/lib/services/pricing-rules-sync.service');
  await ensureImpressionSfRuntimeReady();
  invalidateEventPricingRuntime();
  await ensureEventPricingRuntimeReady();
  return { ok: true, action: 'syncMaterialEquivalences' };
}

export async function syncPromotionalArticleRules() {
  invalidateEventPricingRuntime();
  await ensureEventPricingRuntimeReady();
  return { ok: true, action: 'syncPromotionalArticleRules' };
}

export async function syncMaterialFormatLimits() {
  invalidateEventPricingRuntime();
  await ensureEventPricingRuntimeReady();
  return { ok: true, action: 'syncMaterialFormatLimits' };
}

export async function syncEventBadgePrices() {
  return syncPromotionalArticleRules();
}

export async function syncTicketPrices() {
  return syncPromotionalArticleRules();
}

export async function syncGiftCardPrices() {
  return syncPromotionalArticleRules();
}

export async function syncEnvelopePrices() {
  return syncPromotionalArticleRules();
}

export async function syncFanionPrices() {
  return syncPromotionalArticleRules();
}

export async function syncPhotoboothPrices() {
  return syncPromotionalArticleRules();
}

export async function syncBackdropPrices() {
  return syncPromotionalArticleRules();
}

export async function syncPocketFolderPrices() {
  return syncPromotionalArticleRules();
}

export async function recalculatePosPrices() {
  invalidateEventPricingRuntime();
  await ensureEventPricingRuntimeReady();
  const { ensureImpressionSfRuntimeReady } = await import('@/lib/services/pricing-rules-sync.service');
  await ensureImpressionSfRuntimeReady();
  return { ok: true, action: 'recalculatePosPrices' };
}

export async function verifyPricingConsistency(): Promise<{
  ok: boolean;
  checks: Array<{ name: string; ok: boolean; detail: string }>;
}> {
  await ensureEventPricingRuntimeReady();
  const {
    applyMaterialEquivalenceSupplement,
    DEFAULT_MATERIAL_EQUIVALENCES,
  } = await import('@/lib/pricing/material-equivalence-rules');
  const {
    applyArticlePromotionalDiscount,
    computeEventBadgePrice,
    computeA4DivisionPrice,
    resolveA4Divisor,
  } = await import('@/lib/pricing/event-pricing');
  const { isFormatAllowedForMaterial } = await import('@/lib/pricing/material-format-limits');

  const checks: Array<{ name: string; ok: boolean; detail: string }> = [];

  const o70 = applyMaterialEquivalenceSupplement(400, 'Offset', 70, DEFAULT_MATERIAL_EQUIVALENCES);
  checks.push({
    name: 'Offset 70G = 80G − 20',
    ok: o70.price === 380,
    detail: `got ${o70.price}`,
  });

  const o100 = applyMaterialEquivalenceSupplement(400, 'Offset', 100, DEFAULT_MATERIAL_EQUIVALENCES);
  checks.push({
    name: 'Offset 100G = 90G + 50',
    ok: o100.price === 450,
    detail: `got ${o100.price}`,
  });

  const promo = applyArticlePromotionalDiscount(1500, 40);
  checks.push({
    name: 'Affiche événement PCB A4 1500 → 900',
    ok: promo === 900,
    detail: `got ${promo}`,
  });

  const badge = computeEventBadgePrice({ a4UnitPrice: 13000, widthMm: 100, heightMm: 70 });
  const expectedBadge = Math.round(13000 / 8) + Math.round((13000 / 8) * 0.1) + 50;
  checks.push({
    name: 'Badge PVC 100×70 ≈ A7',
    ok: badge.prixUnitaire === expectedBadge,
    detail: `got ${badge.prixUnitaire} expected ${expectedBadge} (${badge.formula})`,
  });

  const div = resolveA4Divisor(148, 52);
  const ticket = computeA4DivisionPrice({ widthMm: 148, heightMm: 52, a4UnitPrice: 1500, cutAr: 50 });
  checks.push({
    name: 'Billet 148×52 = A4/8 + 50',
    ok: div === 8 && ticket.prixUnitaire === Math.round(1500 / 8) + 50,
    detail: `div=${div} price=${ticket.prixUnitaire}`,
  });

  const glossyA2 = isFormatAllowedForMaterial('Glossy', 'A2');
  checks.push({
    name: 'Glossy bloque A2 (max A3)',
    ok: !glossyA2.allowed,
    detail: glossyA2.reason ?? 'allowed unexpectedly',
  });

  const pvcA3 = isFormatAllowedForMaterial('PVC opaque', 'A3');
  checks.push({
    name: 'PVC opaque bloque A3 (max A4)',
    ok: !pvcA3.allowed,
    detail: pvcA3.reason ?? 'allowed unexpectedly',
  });

  return { ok: checks.every((c) => c.ok), checks };
}

export const pricingRulesSyncService = {
  syncMaterialEquivalences,
  syncPromotionalArticleRules,
  syncMaterialFormatLimits,
  syncEventBadgePrices,
  syncTicketPrices,
  syncGiftCardPrices,
  syncEnvelopePrices,
  syncFanionPrices,
  syncPhotoboothPrices,
  syncBackdropPrices,
  syncPocketFolderPrices,
  recalculatePosPrices,
  verifyPricingConsistency,
};
