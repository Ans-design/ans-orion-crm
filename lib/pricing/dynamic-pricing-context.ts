import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { mergePriceImpactMetadata, resolveFieldPriceImpact } from '@/lib/pricing/price-impact-rules';
import type {
  ArticlePricingProfile,
  DiscountTier,
  FormulaVersion,
  MaterialPrice,
  PricingVariable,
  ProductOptionGroup,
  ProductOptionValue,
  StockRule,
  UrgencyRule,
} from '@prisma/client';

export type DynamicPricingContext = {
  profile: ArticlePricingProfile;
  formula: FormulaVersion;
  discountTiers: DiscountTier[];
  materialPrices: MaterialPrice[];
  variables: PricingVariable[];
  optionGroups: (ProductOptionGroup & { values: ProductOptionValue[] })[];
  urgencyRules: UrgencyRule[];
  stockRules: StockRule[];
};

export async function loadPublishedDynamicContext(
  articleId: string,
): Promise<DynamicPricingContext | null> {
  return loadDynamicContext(articleId, 'published');
}

export async function loadDraftDynamicContext(
  articleId: string,
): Promise<DynamicPricingContext | null> {
  return loadDynamicContext(articleId, 'draft');
}

/** Contexte POS — profil et formule **publiés** uniquement (aligné vente / sellability). */
export async function loadPosDynamicContext(
  articleId: string,
): Promise<DynamicPricingContext | null> {
  const publishedCtx = await loadPublishedDynamicContext(articleId);
  if (!publishedCtx) return null;

  return {
    ...publishedCtx,
    optionGroups: publishedCtx.optionGroups
      .filter((g) => g.visiblePos)
      .map((g) => ({
        ...g,
        values: g.values.filter((v) => v.active),
      })),
  };
}

async function loadDynamicContext(
  articleId: string,
  mode: 'published' | 'draft',
): Promise<DynamicPricingContext | null> {
  try {
    const profile = await prisma.articlePricingProfile.findFirst({
      where:
        mode === 'published'
          ? { articleId, active: true, status: 'published' }
          : { articleId, active: true },
    });
    if (!profile) return null;

    const formula = await prisma.formulaVersion.findFirst({
      where:
        mode === 'published'
          ? { articleId, status: 'published' }
          : { articleId },
      orderBy: { version: 'desc' },
    });
    if (!formula) return null;

    const [discountTiers, materialPrices, optionGroups, urgencyRules, stockRules, globalVars, articleVars] =
      await Promise.all([
      prisma.discountTier.findMany({
        where: { articleId, active: true },
        orderBy: { minQty: 'asc' },
      }),
      prisma.materialPrice.findMany({
        where: { articleId, active: true },
      }),
      prisma.productOptionGroup.findMany({
        where: { articleId, active: true },
        include: { values: { where: { active: true }, orderBy: { sortOrder: 'asc' } } },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.urgencyRule.findMany({
        where: { articleId, active: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.stockRule.findMany({
        where: { articleId, active: true },
      }),
      prisma.pricingVariable.findMany({ where: { scope: 'global', active: true } }),
      prisma.pricingVariable.findMany({ where: { scope: 'article', articleId, active: true } }),
    ]);

    const effectiveOptionGroups = optionGroups.map((group) => {
      const priceImpact = resolveFieldPriceImpact({
        articleId,
        fieldKey: group.fieldKey,
        metadata: group.metadata,
        defaultImpactsPrice: group.impactsPrice,
        defaultIsInformational: group.isInformational,
      });
      return {
        ...group,
        impactsPrice: priceImpact.impactsPrice,
        isInformational: priceImpact.isInformational,
        metadata: mergePriceImpactMetadata(group.metadata, priceImpact) as Prisma.JsonValue,
      };
    });

    return {
      profile,
      formula,
      discountTiers,
      materialPrices,
      variables: [...globalVars, ...articleVars],
      optionGroups: effectiveOptionGroups,
      urgencyRules,
      stockRules,
    };
  } catch {
    return null;
  }
}

export function pricingVariablesAsNumbers(variables: PricingVariable[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of variables) {
    const n = Number(v.value);
    if (Number.isFinite(n)) out[v.code] = n;
  }
  return out;
}
