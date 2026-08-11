import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { CATALOGUE, CAT_LABELS } from '@/lib/data/catalogue';
import { getProductConfig } from '@/lib/data/config-types';
import {
  buildArticleDynamicPricingSeed,
  extractGlobalPricingVariables,
  type ArticleDynamicPricingSeed,
} from '@/lib/pricing/config-to-dynamic-pricing';
import {
  mergePriceImpactMetadata,
  resolveFieldPriceImpact,
} from '@/lib/pricing/price-impact-rules';
import { articleHasDedicatedPricingEngine } from '@/lib/pos/pos-price-policy';

export interface DynamicPricingSyncResult {
  profiles: number;
  optionGroups: number;
  optionValues: number;
  discountTiers: number;
  urgencyRules: number;
  materialPrices: number;
  stockRules: number;
  pricingVariables: number;
  formulaVersions: number;
  articles: number;
  skipped: number;
}

let syncInProgress: Promise<DynamicPricingSyncResult> | null = null;

async function upsertArticleSeed(seed: ArticleDynamicPricingSeed) {
  const { profile, optionGroups, discountTiers, urgencyRules, materialPrices, stockRules, formula } = seed;

  // Moteurs dédiés (ex. Tirage photo A4=3000) : ne jamais réinjecter un ancien prixBase catalogue (350).
  const prixBase = articleHasDedicatedPricingEngine(profile.articleId) ? null : profile.prixBase;

  await prisma.articlePricingProfile.upsert({
    where: { articleId: profile.articleId },
    create: {
      articleId: profile.articleId,
      articleLabel: profile.articleLabel,
      family: profile.family,
      calculationType: profile.calculationType,
      saleUnit: profile.saleUnit,
      status: 'draft',
      prixBase,
      prixM2: profile.prixM2,
      prixCm2: profile.prixCm2,
      qtyMin: profile.qtyMin,
      active: true,
      source: 'config-types-seed',
    },
    update: {
      articleLabel: profile.articleLabel,
      family: profile.family,
      calculationType: profile.calculationType,
      saleUnit: profile.saleUnit,
      prixBase,
      prixM2: profile.prixM2,
      prixCm2: profile.prixCm2,
      qtyMin: profile.qtyMin,
      source: 'config-types-seed',
    },
  });

  let groupsCount = 0;
  let valuesCount = 0;

  for (const group of optionGroups) {
    const existingGroup = await prisma.productOptionGroup.findUnique({
      where: {
        articleId_fieldKey: { articleId: profile.articleId, fieldKey: group.fieldKey },
      },
      select: {
        metadata: true,
      },
    });
    const effectiveImpact = resolveFieldPriceImpact({
      articleId: profile.articleId,
      fieldKey: group.fieldKey,
      metadata: existingGroup?.metadata,
      defaultImpactsPrice: group.impactsPrice,
      defaultIsInformational: group.isInformational,
    });
    const mergedMetadata = mergePriceImpactMetadata(
      {
        ...(group.metadata ?? {}),
        ...(existingGroup?.metadata && typeof existingGroup.metadata === 'object' && !Array.isArray(existingGroup.metadata)
          ? (existingGroup.metadata as Record<string, unknown>)
          : {}),
      },
      effectiveImpact,
    );

    const row = await prisma.productOptionGroup.upsert({
      where: {
        articleId_fieldKey: { articleId: profile.articleId, fieldKey: group.fieldKey },
      },
      create: {
        articleId: profile.articleId,
        fieldKey: group.fieldKey,
        label: group.label,
        sectionTitle: group.sectionTitle,
        sectionIcon: group.sectionIcon,
        fieldType: group.fieldType,
        sortOrder: group.sortOrder,
        visiblePos: group.visiblePos,
        active: group.active,
        required: group.required,
        impactsPrice: effectiveImpact.impactsPrice,
        impactsStock: group.impactsStock,
        impactsProduction: group.impactsProduction,
        isInformational: effectiveImpact.isInformational,
        requiresAdminValidation: group.requiresAdminValidation,
        metadata: mergedMetadata as Prisma.InputJsonValue,
        source: 'config-types-seed',
      },
      update: {
        label: group.label,
        sectionTitle: group.sectionTitle,
        sectionIcon: group.sectionIcon,
        fieldType: group.fieldType,
        sortOrder: group.sortOrder,
        visiblePos: group.visiblePos,
        active: group.active,
        required: group.required,
        impactsPrice: effectiveImpact.impactsPrice,
        impactsStock: group.impactsStock,
        impactsProduction: group.impactsProduction,
        isInformational: effectiveImpact.isInformational,
        requiresAdminValidation: group.requiresAdminValidation,
        metadata: mergedMetadata as Prisma.InputJsonValue,
        source: 'config-types-seed',
      },
    });
    groupsCount++;

    if (group.values.length) {
      await prisma.productOptionValue.deleteMany({ where: { groupId: row.id } });
      const seen = new Set<string>();
      const uniqueValues = group.values.filter((value) => {
        if (seen.has(value.valueKey)) return false;
        seen.add(value.valueKey);
        return true;
      });
      await prisma.productOptionValue.createMany({
        data: uniqueValues.map((value) => ({
          groupId: row.id,
          valueKey: value.valueKey,
          label: value.label,
          sortOrder: value.sortOrder,
          priceModifier: value.priceModifier,
          modifierType: value.modifierType,
          forcePrice: value.forcePrice,
          active: value.active,
          metadata: (value.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        })),
      });
      valuesCount += uniqueValues.length;
    }
  }

  if (discountTiers.length) {
    await Promise.all(
      discountTiers.map((tier) =>
        prisma.discountTier.upsert({
          where: {
            articleId_variantKey_minQty: {
              articleId: profile.articleId,
              variantKey: '',
              minQty: tier.minQty,
            },
          },
          create: {
            articleId: profile.articleId,
            variantKey: '',
            minQty: tier.minQty,
            maxQty: tier.maxQty,
            unitPrice: tier.unitPrice,
            discountPercent: tier.discountPercent,
            active: true,
            source: 'config-types-seed',
          },
          update: {
            maxQty: tier.maxQty,
            unitPrice: tier.unitPrice,
            discountPercent: tier.discountPercent,
            source: 'config-types-seed',
          },
        }),
      ),
    );
  }

  if (urgencyRules.length) {
    await prisma.urgencyRule.createMany({
      data: urgencyRules.map((rule) => ({
        articleId: profile.articleId,
        label: rule.label,
        surchargePercent: rule.surchargePercent,
        requiresValidation: rule.requiresValidation,
        sortOrder: rule.sortOrder,
        active: true,
        source: 'config-types-seed',
      })),
    });
  }

  if (materialPrices.length) {
    await prisma.materialPrice.createMany({
      data: materialPrices.map((mp) => ({
        articleId: profile.articleId,
        materialKey: mp.materialKey,
        grammage: mp.grammage,
        prixM2: mp.prixM2,
        prixCm2: mp.prixCm2,
        scope: mp.scope,
        label: mp.label,
        active: true,
        source: 'config-types-seed',
      })),
    });
  }

  if (stockRules.length) {
    await prisma.stockRule.createMany({
      data: stockRules.map((rule) => ({
        articleId: profile.articleId,
        optionFieldKey: rule.optionFieldKey,
        ruleType: rule.ruleType,
        condition: rule.condition as Prisma.InputJsonValue,
        action: rule.action as Prisma.InputJsonValue,
        active: true,
        source: 'config-types-seed',
      })),
    });
  }

  await prisma.formulaVersion.upsert({
    where: {
      articleId_version: { articleId: profile.articleId, version: formula.version },
    },
    create: {
      articleId: profile.articleId,
      version: formula.version,
      status: formula.status,
      label: formula.label,
      expression: formula.expression,
      variables: formula.variables as Prisma.InputJsonValue,
      source: 'config-types-seed',
    },
    update: {
      label: formula.label,
      expression: formula.expression,
      variables: formula.variables as Prisma.InputJsonValue,
      source: 'config-types-seed',
    },
  });

  return {
    groupsCount,
    valuesCount,
    tiersCount: discountTiers.length,
    urgencyCount: urgencyRules.length,
    stockCount: stockRules.length,
    materialCount: materialPrices.length,
  };
}

/**
 * Update payload for seed sync — preserves DB `value` and `source`
 * so admin / write-through edits survive catalogue sync.
 */
export function pricingVariableSeedUpdateFields(v: {
  label: string;
  unit: string | null;
  valueType: string;
  scope: string;
  articleId: string | null;
}) {
  return {
    label: v.label,
    unit: v.unit,
    valueType: v.valueType,
    scope: v.scope,
    articleId: v.articleId,
    version: { increment: 1 as const },
  };
}

async function seedGlobalPricingVariables() {
  const variables = extractGlobalPricingVariables();
  let count = 0;
  for (const v of variables) {
    await prisma.pricingVariable.upsert({
      where: { code: v.code },
      create: {
        code: v.code,
        label: v.label,
        value: v.value,
        unit: v.unit,
        valueType: v.valueType,
        scope: v.scope,
        articleId: v.articleId,
        active: true,
        source: 'config-types-seed',
      },
      update: pricingVariableSeedUpdateFields(v),
    });
    count++;
  }
  return count;
}

async function clearArticleDynamicPricing(articleId: string) {
  await prisma.urgencyRule.deleteMany({ where: { articleId } });
  await prisma.materialPrice.deleteMany({ where: { articleId } });
  await prisma.stockRule.deleteMany({ where: { articleId } });
}

export async function syncDynamicPricingFromCatalogue(): Promise<DynamicPricingSyncResult> {
  if (syncInProgress) return syncInProgress;
  syncInProgress = doSyncDynamicPricing().finally(() => {
    syncInProgress = null;
  });
  return syncInProgress;
}

async function doSyncDynamicPricing(): Promise<DynamicPricingSyncResult> {
  const result: DynamicPricingSyncResult = {
    profiles: 0,
    optionGroups: 0,
    optionValues: 0,
    discountTiers: 0,
    urgencyRules: 0,
    stockRules: 0,
    materialPrices: 0,
    pricingVariables: 0,
    formulaVersions: 0,
    articles: CATALOGUE.length,
    skipped: 0,
  };

  result.pricingVariables = await seedGlobalPricingVariables();

  for (const article of CATALOGUE) {
    const cfg = getProductConfig(article.id, article.configType);
    if (!cfg) {
      result.skipped++;
      continue;
    }

    const family = CAT_LABELS[article.category] || article.category;
    const seed = buildArticleDynamicPricingSeed(
      article.id,
      article.name,
      family,
      article.unit,
      article.prixDepart,
      cfg,
    );

    await clearArticleDynamicPricing(article.id);
    const upserted = await upsertArticleSeed(seed);

    result.profiles++;
    result.optionGroups += upserted.groupsCount;
    result.optionValues += upserted.valuesCount;
    result.discountTiers += upserted.tiersCount;
    result.urgencyRules += upserted.urgencyCount;
    result.stockRules += upserted.stockCount;
    result.materialPrices += upserted.materialCount;
    result.formulaVersions++;

    if (result.profiles % 10 === 0) {
      console.log(`[dynamic-pricing] ${result.profiles}/${CATALOGUE.length} articles…`);
    }
  }

  return result;
}
