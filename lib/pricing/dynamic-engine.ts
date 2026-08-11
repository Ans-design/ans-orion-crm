import { findCatalogueItem } from '@/lib/data/catalogue-meta';
import { getProductConfig } from '@/lib/data/config-types';
import { isGrandFormatCustomFormat } from '@/lib/grand-format/pricing';
import { calculateGrandFormatPrice } from '@/lib/grand-format/calculate-grand-format-price';
import { loadGrandFormatStockProfile, resolveAvailableLaizesCm } from '@/lib/grand-format/stock-profile';
import { isGrandFormatArticleId } from '@/lib/grand-format/article-meta';
import { isBacheArticleId } from '@/lib/pos/bache-catalog';
import { evaluateBache } from '@/lib/grand-format/bache-rules';
import { bacheEvalToGfBillable } from '@/lib/grand-format/bache-bridge';
import { resolvePackagingMaterialRecap } from '@/lib/packaging/material-recap';
import { applyFixedFees, getGlobalPricingConfig } from '@/lib/pricing/global-config';
import { DEFAULT_GLOBAL_PRICING } from '@/lib/data/global-pricing';
import { applyProductionSurcharge } from '@/lib/pricing/production-pricing';
import { evaluateStockConsumptionAsync } from '@/lib/pricing/stock-rule-engine';
import {
  applyFinitionSurcharge,
  isRectoVerso,
  resolveConfigFace,
  resolveForcedUnitPrice,
} from '@/lib/pricing/config-normalize';
import { shouldSkipRectoVersoMultiplier } from '@/lib/finition/finition-pricing';
import { toValueKey } from '@/lib/pricing/config-to-dynamic-pricing';
import type { DynamicPricingContext } from '@/lib/pricing/dynamic-pricing-context';
import { loadPosDynamicContext, pricingVariablesAsNumbers } from '@/lib/pricing/dynamic-pricing-context';
import { pickTierUnitPrice, pickAppliedConfigTier, pickAppliedDbTier } from '@/lib/pricing/tier-price';
import type { PriceResult } from '@/lib/pricing/price-types';
import { volumeRemiseAmount, volumeRemiseRate } from '@/lib/pricing/volume-remise';
import { lookupPublishedBasePrintingPrice } from '@/lib/server/modules/pricing/base-printing-price.service';
import {
  computeGoodiesUnitPrice,
  isGoodiesArticleId,
  type GoodiesOptionHit,
} from '@/lib/pricing/goodies-pricing';
import { isTextileArticleId, resolveTextilePriceResult } from '@/lib/pricing/textile-pricing';
import { prisma } from '@/lib/prisma';
import {
  applyPriceBlocksToUnit,
  type PriceBlock,
} from '@/lib/pricing/price-builder-blocks';
import {
  resolvePriceAddonAr,
  resolvePriceMultiplier,
} from '@/lib/money/option-modifier';
import { roundMga } from '@/lib/money/mga';
import {
  pickDiscountTiersForVariant,
  resolvePricingVariantKey,
} from '@/lib/pricing/ans-palier-remise-map';

function normalizeQty(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

export interface DynamicComputeResult {
  prixUnitaire: number;
  priceSource: string;
  pipeline: Record<string, unknown>;
}

function pickDbTierUnitPrice(
  tiers: { id?: string; minQty: number; maxQty: number | null; unitPrice: number | null; discountPercent?: number | null; active?: boolean }[],
  qty: number,
  fallback: number,
): number {
  return pickAppliedDbTier(tiers, qty, fallback)?.unitPrice ?? fallback;
}

function configValuesForField(config: Record<string, unknown>, fieldKey: string): string[] {
  const raw = config[fieldKey];
  if (raw == null || raw === '') return [];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'object') return [];
  return [String(raw)];
}

export function computeDynamicUnitPrice(
  articleId: string,
  config: Record<string, unknown>,
  qty: number,
  ctx: DynamicPricingContext,
): DynamicComputeResult {
  const { profile, materialPrices, optionGroups, variables, formula } = ctx;
  const variantKey = resolvePricingVariantKey(articleId, config);
  const discountTiers = pickDiscountTiersForVariant(ctx.discountTiers, variantKey);
  const productConfig = getProductConfig(articleId);
  const pipeline: Record<string, unknown> = {
    engine: 'dynamic',
    formulaVersion: formula.version,
    calculationType: profile.calculationType,
    expression: formula.expression,
    discountVariantKey: variantKey,
  };

  // Goodies Admin : vierge + technique + addons (pas de priceTiers figés)
  if (isGoodiesArticleId(articleId)) {
    const optionHits: GoodiesOptionHit[] = [];
    for (const g of optionGroups) {
      for (const v of g.values) {
        optionHits.push({
          fieldKey: g.fieldKey,
          label: v.label,
          priceModifier: v.priceModifier,
          metadata: (v.metadata as Record<string, unknown> | null) ?? null,
        });
      }
    }
    const g = computeGoodiesUnitPrice({
      articleId,
      config,
      optionHits,
      params: (ctx as DynamicPricingContext & { goodiesParams?: Record<string, number> }).goodiesParams,
    });
    Object.assign(pipeline, g.pipeline);
    pipeline.unitBeforeFees = g.unitPrice;
    return { prixUnitaire: g.unitPrice, priceSource: 'goodiesAdmin', pipeline };
  }

  let prixUnit = profile.prixBase ?? 0;
  let priceSource = 'dynamicPrixBase';
  let appliedTier = null as ReturnType<typeof pickAppliedDbTier>;

  if (discountTiers.length) {
    appliedTier = pickAppliedDbTier(discountTiers, qty, prixUnit);
    prixUnit = appliedTier?.unitPrice ?? pickDbTierUnitPrice(discountTiers, qty, prixUnit);
    priceSource = 'dynamicDiscountTier';
    pipeline.discountTierQty = qty;
  } else if (productConfig?.priceTiers?.length) {
    appliedTier = pickAppliedConfigTier(productConfig.priceTiers, qty, prixUnit);
    prixUnit = appliedTier?.unitPrice ?? pickTierUnitPrice(productConfig.priceTiers, qty, prixUnit);
    priceSource = 'dynamicConfigTier';
  }
  if (appliedTier) pipeline.appliedTier = appliedTier;

  const articleM2 = materialPrices.find((m) => m.prixM2 != null)?.prixM2 ?? profile.prixM2 ?? productConfig?.prixM2;
  const articleCm2 = materialPrices.find((m) => m.prixCm2 != null)?.prixCm2 ?? profile.prixCm2 ?? productConfig?.prixCm2;
  const calcType = profile.calculationType;

  if (calcType === 'm2' || calcType === 'laize') {
    const largCm = Number(config.largeur_cm) || 0;
    const hautCm = Number(config.hauteur_cm) || 0;
    if (articleM2 && largCm > 0 && hautCm > 0) {
      const m2 = (largCm * hautCm) / 10000;
      prixUnit = Math.round(articleM2 * m2);
      priceSource = 'dynamicM2Dims';
      pipeline.surfaceM2 = m2;
    }
  }

  if (articleCm2 && (calcType === 'cm2' || calcType === 'developpe')) {
    const recap = resolvePackagingMaterialRecap(articleId, config);
    if (recap) {
      prixUnit = Math.round(articleCm2 * recap.surfaceCm2);
      priceSource = 'dynamicCm2Surface';
      pipeline.surfaceCm2 = recap.surfaceCm2;
    }
  }

  const numericVars = pricingVariablesAsNumbers(variables);
  pipeline.variables = numericVars;

  for (const group of optionGroups.filter((g) => g.impactsPrice)) {
    const selected = configValuesForField(config, group.fieldKey);
    for (const label of selected) {
      const opt =
        group.values.find((v) => v.label === label) ||
        group.values.find((v) => v.valueKey === toValueKey(label));
      if (!opt) continue;
      const addonAr = resolvePriceAddonAr(opt);
      const mult = resolvePriceMultiplier(opt);
      if (addonAr === 0 && mult === 0) continue;
      const before = prixUnit;
      switch (opt.modifierType) {
        case 'multiplier':
          prixUnit = roundMga(prixUnit * (1 + mult));
          break;
        case 'm2': {
          const m2 = Number(pipeline.surfaceM2) || 0;
          prixUnit = roundMga(prixUnit + addonAr * m2);
          break;
        }
        case 'piece':
          prixUnit = roundMga(prixUnit + addonAr);
          break;
        default:
          prixUnit = roundMga(prixUnit + addonAr);
      }
      pipeline[`option_${group.fieldKey}`] = {
        label,
        before,
        after: prixUnit,
        modifier: opt.modifierType === 'multiplier' ? mult : addonAr,
        priceAddonAr: addonAr,
        priceMultiplier: mult,
      };
    }
  }

  // Constructeur visuel : si des blocs sont stockés dans la formule, les exécuter
  // (ordre, marge correcte, arrondi, minimum) — sinon conserver le pipeline historique.
  // RV / finitions APRÈS les blocs pour ne pas être écrasés par le total blocs.
  const rawBlocks = (variables as { blocks?: unknown })?.blocks
    ?? (formula as { variables?: { blocks?: unknown } })?.variables?.blocks;
  if (Array.isArray(rawBlocks) && rawBlocks.length > 0) {
    const blocks = rawBlocks as PriceBlock[];
    let optionModifiers = 0;
    for (const group of optionGroups.filter((g) => g.impactsPrice)) {
      const selected = configValuesForField(config, group.fieldKey);
      for (const label of selected) {
        const opt =
          group.values.find((v) => v.label === label) ||
          group.values.find((v) => v.valueKey === toValueKey(label));
        if (opt) optionModifiers += resolvePriceAddonAr(opt);
      }
    }
    const applied = applyPriceBlocksToUnit(blocks, {
      qty,
      prixBase: profile.prixBase ?? 0,
      prixM2: articleM2,
      prixCm2: articleCm2,
      surfaceM2: Number(pipeline.surfaceM2) || 0,
      surfaceCm2: Number(pipeline.surfaceCm2) || 0,
      tierUnit: appliedTier?.unitPrice ?? null,
      materialCost: 0,
      optionModifiers,
      finishingCost: 0,
    });
    pipeline.visualBlocks = applied.trace;
    pipeline.visualBlocksTotal = applied.total;
    prixUnit = applied.unit;
    priceSource = 'dynamicVisualBlocks';
  }

  const faceRaw = resolveConfigFace(config);
  if (isRectoVerso(faceRaw) && !shouldSkipRectoVersoMultiplier(articleId, config)) {
    const faceMult = numericVars.face_recto_verso_mult ?? 1.8;
    prixUnit = Math.round(prixUnit * faceMult);
    pipeline.rectoVerso = true;
  }

  const finitionPct = numericVars.finition_surcharge_pct ?? 12;
  // Surface cm² packaging soft : finitions souvent déjà dans les options / formules
  if (priceSource !== 'dynamicCm2Surface') {
    prixUnit = applyFinitionSurcharge(prixUnit, config, articleId, finitionPct);
  }
  pipeline.unitBeforeFees = prixUnit;

  return { prixUnitaire: prixUnit, priceSource, pipeline };
}

async function computeGrandFormatDynamicUnit(
  articleId: string,
  config: Record<string, unknown>,
  qty: number,
  articleM2: number | null | undefined,
  productConfig: ReturnType<typeof getProductConfig>,
): Promise<{ prixUnit: number; priceSource: string; pipeline: Record<string, unknown>; gfBillable?: unknown } | null> {
  const profile = await loadGrandFormatStockProfile(articleId);
  if (!profile) return null;

  const availableLaizesCm = resolveAvailableLaizesCm(profile, articleId);
  const prixM2Gf = profile.prixA0 ?? profile.prixM2Fallback ?? articleM2 ?? productConfig?.prixM2 ?? null;
  const pipeline: Record<string, unknown> = {};

  if (isBacheArticleId(articleId)) {
    const bacheEv = evaluateBache(config, { prixM2: prixM2Gf ?? undefined });
    const gfBillable = bacheEvalToGfBillable(bacheEv, prixM2Gf);
    if (bacheEv.finalTotal != null && bacheEv.finalTotal > 0 && qty > 0) {
      return {
        prixUnit: Math.round(bacheEv.finalTotal / qty),
        priceSource: 'dynamicBacheEngine',
        pipeline: { bache: bacheEv },
        gfBillable,
      };
    }
    if (bacheEv.surDevis) {
      return { prixUnit: 0, priceSource: 'dynamicSurDevis', pipeline: { bache: bacheEv }, gfBillable };
    }
  }

  const gfFull = calculateGrandFormatPrice({
    config,
    availableLaizesCm,
    prixM2: prixM2Gf,
    stockKind: profile.stockKind,
    quantite: qty,
    useA0FractionPricing: !isGrandFormatCustomFormat(config),
  });

  if (gfFull.calculable) {
    return {
      prixUnit: gfFull.prixUnitaireFinal,
      priceSource: isGrandFormatCustomFormat(config) ? 'dynamicGfLaize' : 'dynamicGfStandard',
      pipeline: { gfBillable: gfFull, margeDecoupe: gfFull.margeDecoupe },
      gfBillable: gfFull,
    };
  }

  if (isGrandFormatCustomFormat(config) && gfFull.surDevis) {
    return { prixUnit: 0, priceSource: 'dynamicSurDevis', pipeline: { gfBillable: gfFull }, gfBillable: gfFull };
  }

  return null;
}

export async function tryComputeDynamicPrice(
  articleId: string,
  config: Record<string, unknown>,
  options?: { prixForce?: number; totalForce?: number; priceReason?: string },
  ctx?: DynamicPricingContext | null,
): Promise<PriceResult | null> {
  let article = findCatalogueItem(articleId);
  if (!article) {
    try {
      const { resolveCatalogueItemFromDb } = await import('@/lib/services/catalogue-service');
      article = (await resolveCatalogueItemFromDb(articleId)) ?? undefined;
    } catch {
      article = undefined;
    }
  }
  if (!article) return null;

  // Textile Admin : support + marquage + MO (ou surface m² Lambahoany)
  if (isTextileArticleId(articleId)) {
    return resolveTextilePriceResult(articleId, config, options);
  }

  const context = ctx ?? (await loadPosDynamicContext(articleId));
  if (!context) return null;

  const basePrinting = await lookupPublishedBasePrintingPrice(articleId, config);
  if (basePrinting?.prixUnitaire) {
    context.profile = {
      ...context.profile,
      prixBase: basePrinting.prixUnitaire,
    };
  }

  const productConfig = getProductConfig(articleId, article.configType);
  let qty = normalizeQty(config.qty ?? config.quantite ?? config.quantity ?? config.qte ?? 1);
  if (config.tailles && typeof config.tailles === 'object' && !Array.isArray(config.tailles)) {
    qty = Object.values(config.tailles as Record<string, number>).reduce((s, q) => s + (Number(q) || 0), 0) || qty;
  }

  let { prixUnitaire, priceSource, pipeline } = computeDynamicUnitPrice(articleId, config, qty, context);

  // Params PVC porte-clé depuis addons Admin (non visibles POS)
  if (isGoodiesArticleId(articleId) && articleId === 'gd-portecles') {
    try {
      const params = await prisma.goodiesAddon.findMany({
        where: {
          articleId: 'gd-portecles',
          deletedAt: null,
          active: true,
          fieldKey: { in: ['pvc_opaque_a4', 'pvc_diviseur_a4', 'decoupe', 'attache'] },
        },
      });
      const map: Record<string, number> = {};
      for (const p of params) {
        if (p.fieldKey === 'pvc_opaque_a4') map.pvcOpaqueA4 = p.price;
        if (p.fieldKey === 'pvc_diviseur_a4') map.pvcDiviseurA4 = p.price;
        if (p.fieldKey === 'decoupe') map.decoupe = p.price;
        if (p.fieldKey === 'attache') map.attache = p.price;
      }
      // Essayer prix PVC opaque A4 depuis ISF
      try {
        const pvc = await lookupPublishedBasePrintingPrice('imp-impression', {
          matiere: 'PVC opaque',
          format: 'A4',
          type: 'Impression numérique couleur',
          face: 'Recto',
          qty: 1,
        });
        if (pvc?.prixUnitaire && pvc.prixUnitaire > 0) map.pvcOpaqueA4 = pvc.prixUnitaire;
      } catch {
        /* fallback addon */
      }
      const enriched = { ...context, goodiesParams: map };
      const recomputed = computeDynamicUnitPrice(articleId, config, qty, enriched as typeof context);
      prixUnitaire = recomputed.prixUnitaire;
      priceSource = recomputed.priceSource;
      pipeline = recomputed.pipeline;
    } catch {
      /* keep first pass */
    }
  }

  if (isGrandFormatArticleId(articleId)) {
    const articleM2 = context.profile.prixM2 ?? productConfig?.prixM2;
    const gf = await computeGrandFormatDynamicUnit(articleId, config, qty, articleM2, productConfig);
    if (gf) {
      prixUnitaire = gf.prixUnit;
      priceSource = gf.priceSource;
      pipeline = { ...pipeline, ...gf.pipeline };
    }
  }

  let pricingMode: PriceResult['pricingMode'] = 'auto';
  const forcedPu = options?.prixForce ?? resolveForcedUnitPrice(config);
  if (forcedPu > 0) {
    prixUnitaire = forcedPu;
    pricingMode = 'force_pu';
  }

  const variantKey = resolvePricingVariantKey(articleId, config);
  const variantTiers = pickDiscountTiersForVariant(context.discountTiers, variantKey);
  const activeTier = variantTiers.find(
    (t) => qty >= t.minQty && (t.maxQty == null || qty <= t.maxQty),
  );
  const articlePct = activeTier && activeTier.discountPercent > 0
    ? activeTier.discountPercent
    : 0;

  // Remise % article → intégrée au PU (aligné Admin / calculate.ts)
  if (articlePct > 0 && prixUnitaire > 0) {
    prixUnitaire = Math.round(prixUnitaire * (1 - articlePct / 100));
    pipeline.articleTierRemisePct = articlePct;
    pipeline.appliedTier = activeTier
      ? {
          source: 'db_discount',
          label:
            activeTier.maxQty == null
              ? `≥ ${activeTier.minQty}`
              : `${activeTier.minQty}–${activeTier.maxQty}`,
          minQty: activeTier.minQty,
          maxQty: activeTier.maxQty,
          unitPrice: prixUnitaire,
          discountPercent: articlePct,
        }
      : pipeline.appliedTier;
  }

  const remiseRate =
    articlePct > 0
      ? 0
      : volumeRemiseRate(qty);

  const clicheFee = Number(config.cliche) || 0;
  const sousTotal = prixUnitaire * qty;
  const remiseAmount =
    articlePct > 0
      ? 0
      : volumeRemiseAmount(sousTotal, qty);

  let totalHT = sousTotal - remiseAmount + clicheFee;

  if (options?.totalForce && options.totalForce > 0) {
    totalHT = options.totalForce;
    pricingMode = 'force_total';
  }

  let globalCfg = DEFAULT_GLOBAL_PRICING;
  try {
    globalCfg = await getGlobalPricingConfig();
  } catch {
    /* fallback */
  }

  if (!(options?.totalForce && options.totalForce > 0)) {
    const delai = String(config.delai || config.delaiProduction || config.delai_realisation || '');
    const { totalHT: totalAfterProduction, production } = applyProductionSurcharge(
      totalHT,
      delai,
      context.urgencyRules,
      globalCfg,
    );
    totalHT = totalAfterProduction;
    pipeline.production = production;
  }

  const stockConsumption = await evaluateStockConsumptionAsync(
    articleId,
    config,
    qty,
    context.stockRules,
    context.profile.calculationType,
  );
  pipeline.stockConsumption = stockConsumption;
  const fees = applyFixedFees(
    totalHT,
    {
      bat: String(config.bat || config.epreuve || ''),
      livraison: String(config.livraison || config.modeLivraison || ''),
    },
    globalCfg,
  );
  totalHT = fees.totalHT;

  const tvaRate = (globalCfg.tvaDefault ?? 20) / 100;

  return {
    articleId,
    articleLabel: article.name,
    qty,
    prixUnitaire,
    sousTotal,
    remiseRate,
    remiseAmount,
    clicheFee,
    totalHT,
    totalTTC: Math.round(totalHT * (1 + tvaRate)),
    pricingMode,
    formulaApplied: context.formula.expression,
    snapshot: {
      config: { ...config, qty },
      calculatedAt: new Date().toISOString(),
      priceReason: options?.priceReason || null,
      priceSource,
      dynamicEngine: true,
      formulaVersion: context.formula.version,
      profileStatus: context.profile.status,
      appliedTier: (pipeline.appliedTier as import('@/lib/pricing/tier-price').AppliedTierSnapshot | null) ?? null,
      pipeline,
      stockConsumption,
      productionSurcharge: pipeline.production ?? null,
      globalFees: { batFee: fees.batFee, livraisonFee: fees.livraisonFee, tvaRate },
    },
  };
}
