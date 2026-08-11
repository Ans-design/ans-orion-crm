/**
 * pricingResolver — point d’entrée unique POS / Admin pour résoudre un prix.
 * Stock & Matières (BaseMaterial + MaterialContextPrice) = source.
 * Prix & Calculs = règles (formats, promo, paliers) appliquées ensuite.
 */
import { prisma } from '@/lib/prisma';
import {
  getMaterialBasePrice,
  type PriceContext,
} from '@/lib/pricing/material-context-price';
import { applyImpressionSfFormatPrice } from '@/lib/pricing/impression-sf-pricing';
import { applyArticlePromotionalDiscount, findPromoRuleForArticle, isPromoPetitFormatMaterial } from '@/lib/pricing/event-pricing';
import { isFormatAllowedForMaterial } from '@/lib/pricing/material-format-limits';
import { pickTierUnitPrice } from '@/lib/pricing/tier-price';
import { volumeRemiseRate } from '@/lib/pricing/volume-remise';
import { calculateGrandFormatPrice } from '@/lib/grand-format/calculate-grand-format-price';
import { loadGrandFormatStockProfile, resolveAvailableLaizesCm } from '@/lib/grand-format/stock-profile';
import { isGrandFormatArticleId } from '@/lib/grand-format/article-meta';

export type ResolvedPrice = {
  prixUnitaire: number;
  source: string;
  materialKey?: string | null;
  context?: string;
  formula?: string;
  surDevis?: boolean;
};

async function findBaseMaterial(materialKeyOrLabel: string) {
  if (!materialKeyOrLabel.trim()) return null;
  const key = materialKeyOrLabel.trim();
  try {
    return await prisma.baseMaterial.findFirst({
      where: {
        archived: false,
        active: true,
        OR: [
          { materialKey: key },
          { materialKey: { startsWith: `${key}:` } },
          { label: key },
          { label: { contains: key } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
    });
  } catch {
    return null;
  }
}

/** Prix matière brut selon contexte (sans formules format). */
export async function resolveGetMaterialBasePrice(
  materialIdOrKey: string,
  context: PriceContext | string,
  opts?: { format?: string | null; unit?: string | null },
): Promise<ResolvedPrice | null> {
  const ctx = await getMaterialBasePrice(materialIdOrKey, context, opts);
  if (ctx) {
    return {
      prixUnitaire: ctx.priceHT,
      source: ctx.source,
      materialKey: materialIdOrKey,
      context,
    };
  }

  // Fallback BaseMaterial.basePrintPrice / purchasePrice (pas de seed inventé)
  const mat = await findBaseMaterial(materialIdOrKey);
  if (!mat) return null;

  if (context === 'RAW_STOCK' || context === 'BLANK_MATERIAL') {
    if (mat.purchasePrice != null && mat.purchasePrice > 0) {
      return {
        prixUnitaire: mat.purchasePrice,
        source: 'baseMaterial.purchasePrice',
        materialKey: mat.materialKey,
        context,
      };
    }
  }

  if (mat.basePrintPrice != null && mat.basePrintPrice > 0) {
    return {
      prixUnitaire: mat.basePrintPrice,
      source: 'baseMaterial.basePrintPrice',
      materialKey: mat.materialKey,
      context,
    };
  }

  // Fallback legacy BasePrintingPrice publié (vue ISF encore non migrée)
  if (context === 'PRINT_SMALL_FORMAT') {
    try {
      const bpp = await prisma.basePrintingPrice.findFirst({
        where: {
          active: true,
          publicationStatus: 'published',
          OR: [
            { materialKey: mat.materialKey },
            { materialKey: materialIdOrKey },
            { baseMaterialId: mat.id },
          ],
        },
        orderBy: { updatedAt: 'desc' },
      });
      if (bpp && (bpp.basePrice ?? 0) > 0) {
        return {
          prixUnitaire: bpp.basePrice!,
          source: 'basePrintingPrice.legacy',
          materialKey: bpp.materialKey,
          context,
          formula: `legacy:${bpp.id}`,
        };
      }
    } catch { /* ignore */ }
  }

  if (context === 'PRINT_GRAND_FORMAT') {
    try {
      const gf = await prisma.grandFormatPricing.findFirst({
        where: {
          active: true,
          OR: [
            { materialKey: mat.materialKey },
            { materialKey: materialIdOrKey },
            { baseMaterialId: mat.id },
            { name: { contains: mat.label } },
          ],
        },
        orderBy: { updatedAt: 'desc' },
      });
      const m2 = gf?.pricePerM2 ?? gf?.basePrice;
      if (m2 != null && m2 > 0) {
        return {
          prixUnitaire: m2,
          source: 'grandFormatPricing.legacy',
          materialKey: gf?.materialKey,
          context,
        };
      }
    } catch { /* ignore */ }
  }

  return null;
}

export async function resolveSmallFormatPrice(
  materialIdOrKey: string,
  format: string,
  options?: { config?: Record<string, unknown>; qty?: number },
): Promise<ResolvedPrice | null> {
  const base = await resolveGetMaterialBasePrice(materialIdOrKey, 'PRINT_SMALL_FORMAT', {
    format: 'A4',
    unit: 'a4',
  });
  if (!base) return null;

  const check = isFormatAllowedForMaterial(materialIdOrKey, format);
  if (!check.allowed) {
    return { prixUnitaire: 0, source: 'format_blocked', surDevis: true, formula: check.reason };
  }

  const formatted = applyImpressionSfFormatPrice(base.prixUnitaire, {
    ...(options?.config ?? {}),
    format,
  });
  if (formatted.surDevis) {
    return { prixUnitaire: 0, source: 'format_sur_devis', surDevis: true, formula: formatted.formula };
  }

  return {
    prixUnitaire: formatted.prixUnitaire,
    source: 'pricingResolver.smallFormat',
    materialKey: base.materialKey,
    context: 'PRINT_SMALL_FORMAT',
    formula: `${base.source}|${formatted.formula}`,
  };
}

export async function resolveGrandFormatPrice(
  materialIdOrKey: string,
  widthMm: number,
  heightMm: number,
  _thickness?: string,
  options?: { articleId?: string; availableLaizesCm?: number[] },
): Promise<ResolvedPrice | null> {
  const check = isFormatAllowedForMaterial(materialIdOrKey, 'Personnalisé', widthMm, heightMm);
  if (!check.allowed) {
    return { prixUnitaire: 0, source: 'format_blocked', surDevis: true, formula: check.reason };
  }

  const base = await resolveGetMaterialBasePrice(materialIdOrKey, 'PRINT_GRAND_FORMAT', {
    unit: 'm2',
  });
  if (!base) return null;

  const widthCm = widthMm / 10;
  const heightCm = heightMm / 10;
  if (!(widthCm > 0 && heightCm > 0)) {
    return { prixUnitaire: 0, source: 'dims_invalid', surDevis: true };
  }

  let availableLaizesCm = options?.availableLaizesCm ?? [];
  const articleId = options?.articleId;
  if ((!availableLaizesCm.length) && articleId && isGrandFormatArticleId(articleId)) {
    try {
      const profile = await loadGrandFormatStockProfile(articleId);
      if (profile) availableLaizesCm = resolveAvailableLaizesCm(profile, articleId);
    } catch {
      /* best-effort */
    }
  }

  const gf = calculateGrandFormatPrice({
    config: {
      format: 'Format personnalisé',
      largeur_cm: widthCm,
      hauteur_cm: heightCm,
      qty: 1,
    },
    availableLaizesCm,
    prixM2: base.prixUnitaire,
    stockKind: 'rouleau',
    quantite: 1,
    useA0FractionPricing: false,
  });

  if (!gf.calculable || gf.surDevis || !(gf.prixUnitaireFinal > 0)) {
    return {
      prixUnitaire: 0,
      source: 'pricingResolver.grandFormat',
      materialKey: base.materialKey,
      context: 'PRINT_GRAND_FORMAT',
      surDevis: true,
      formula: gf.surDevis ? 'gf_sur_devis' : 'gf_not_calculable',
    };
  }

  return {
    prixUnitaire: gf.prixUnitaireFinal,
    source: 'pricingResolver.grandFormat.laizeSurface',
    materialKey: base.materialKey,
    context: 'PRINT_GRAND_FORMAT',
    formula: `${gf.surfaceFactureeM2.toFixed(3)}m²×${base.prixUnitaire}|laize=${gf.laizeUtiliseeCm ?? 'n/a'}`,
  };
}

export function applyPromotionalRule(
  price: number,
  articleId: string,
  materialIdOrLabel: string,
): { price: number; applied: boolean; pct: number } {
  const rule = findPromoRuleForArticle(articleId);
  if (!rule || !isPromoPetitFormatMaterial(materialIdOrLabel)) {
    return { price, applied: false, pct: 0 };
  }
  if (rule.discountType === 'percent') {
    return {
      price: applyArticlePromotionalDiscount(price, rule.discountValue),
      applied: true,
      pct: rule.discountValue,
    };
  }
  return { price: Math.max(0, Math.round(price - rule.discountValue)), applied: true, pct: 0 };
}

export async function applyQuantityTiers(
  price: number,
  quantity: number,
  articleId: string,
): Promise<{ price: number; rate: number }> {
  try {
    const tiers = await prisma.discountTier.findMany({
      where: { articleId, active: true },
      orderBy: { minQty: 'asc' },
    });
    if (tiers.length) {
      const mapped = tiers.map((t) => ({
        max: t.maxQty ?? Infinity,
        px: t.unitPrice ?? price * (1 - (t.discountPercent ?? 0) / 100),
      }));
      const unit = pickTierUnitPrice(mapped, quantity, price);
      return { price: unit, rate: price > 0 ? 1 - unit / price : 0 };
    }
  } catch { /* ignore */ }

  const rate = volumeRemiseRate(quantity);
  return { price: Math.round(price * (1 - rate)), rate };
}

export function validateMaterialFormatCompatibility(
  materialIdOrLabel: string,
  format: string,
  widthMm?: number,
  heightMm?: number,
) {
  return isFormatAllowedForMaterial(materialIdOrLabel, format, widthMm, heightMm);
}

/**
 * Prix final POS — délègue aux moteurs dédiés si présents, sinon resolver matière.
 */
export async function calculateFinalPOSPrice(
  articleId: string,
  configuration: Record<string, unknown>,
): Promise<ResolvedPrice | null> {
  // Moteurs métier existants (événementiel, tirage, etc.) via calculatePrice
  const { calculatePrice } = await import('@/lib/pricing/calculate');
  const result = await calculatePrice(articleId, configuration, { skipDynamic: false });
  if (!result) return null;
  const priceSource =
    typeof result.snapshot?.priceSource === 'string' && result.snapshot.priceSource
      ? result.snapshot.priceSource
      : 'calculatePrice';
  return {
    prixUnitaire: result.prixUnitaire,
    source: priceSource,
    formula: result.formulaApplied ?? priceSource,
  };
}

export async function resolveDirectSalePrice(
  articleId: string,
  configuration: Record<string, unknown> = {},
): Promise<ResolvedPrice | null> {
  try {
    const profile = await prisma.productPricingProfile.findUnique({
      where: { articleId },
    });
    if (profile?.pricingMode === 'DIRECT_FIXED_PRICE' && profile.directPrice != null && profile.directPrice > 0) {
      return {
        prixUnitaire: profile.directPrice,
        source: 'productPricingProfile.direct',
        formula: 'DIRECT_FIXED_PRICE',
      };
    }
    if (profile?.pricingMode === 'MATERIAL_BASED' && profile.baseMaterialId) {
      const mat = await prisma.baseMaterial.findUnique({ where: { id: profile.baseMaterialId } });
      if (mat) {
        return resolveSmallFormatPrice(
          mat.materialKey,
          String(configuration.format ?? 'A4'),
          { config: configuration },
        );
      }
    }
    if (profile?.pricingMode === 'GRAND_FORMAT_SURFACE' && profile.baseMaterialId) {
      const mat = await prisma.baseMaterial.findUnique({ where: { id: profile.baseMaterialId } });
      const w = Number(configuration.largeur_mm) || Number(configuration.format_largeur) || 0;
      const h = Number(configuration.hauteur_mm) || Number(configuration.format_hauteur) || 0;
      if (mat && w && h) {
        return resolveGrandFormatPrice(mat.materialKey, w, h, undefined, { articleId });
      }
    }
  } catch { /* table absente */ }

  try {
    const ds = await prisma.directSaleArticle.findFirst({
      where: { OR: [{ id: articleId }, { slug: articleId }], status: 'published' },
    });
    if (ds?.unitPrice != null && ds.unitPrice > 0) {
      return {
        prixUnitaire: ds.unitPrice,
        source: 'directSaleArticle.unitPrice',
        materialKey: ds.materialKey,
      };
    }
  } catch { /* ignore */ }

  return calculateFinalPOSPrice(articleId, configuration);
}

export async function resolveHybridArticlePrice(
  articleId: string,
  configuration: Record<string, unknown>,
): Promise<ResolvedPrice | null> {
  return calculateFinalPOSPrice(articleId, configuration);
}

/** Alias API demandée. */
export const pricingResolver = {
  getMaterialBasePrice: resolveGetMaterialBasePrice,
  resolveMaterialPrice: resolveGetMaterialBasePrice,
  resolveSmallFormatPrice,
  resolveGrandFormatPrice,
  resolveDirectSalePrice,
  resolveDirectPrice: resolveDirectSalePrice,
  resolveHybridArticlePrice,
  resolveHybridPrice: resolveHybridArticlePrice,
  resolveArticlePrice: calculateFinalPOSPrice,
  applyQuantityTiers,
  applyQuantityTier: applyQuantityTiers,
  applyPromotionalRule,
  applyPromotionRule: applyPromotionalRule,
  validateMaterialFormatCompatibility,
  validateCompatibility: validateMaterialFormatCompatibility,
  calculateFinalPOSPrice,
  returnPriceBreakdown: calculateFinalPOSPrice,
};
