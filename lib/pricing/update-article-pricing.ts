import { prisma } from '@/lib/prisma';
import { dualWriteOptionModifier } from '@/lib/money/option-modifier';
import {
  normalizeOptionFlags,
  validateDiscountTiers,
  type TierInput,
} from '@/lib/pricing/validate-discount-tiers';
import {
  mergePriceImpactMetadata,
  resolveFieldPriceImpact,
  writeManualPriceImpactOverride,
} from '@/lib/pricing/price-impact-rules';
import {
  blocksToExpression,
  buildFormulaVariablesPayload,
  validatePriceBlocks,
  type PriceBlock,
} from '@/lib/pricing/price-builder-blocks';

export async function updateArticlePricingProfile(
  articleId: string,
  data: {
    prixBase?: number | null;
    prixM2?: number | null;
    prixCm2?: number | null;
    qtyMin?: number | null;
  },
) {
  const profile = await prisma.articlePricingProfile.findUnique({ where: { articleId } });
  if (!profile) throw new Error('Profil introuvable');

  return prisma.articlePricingProfile.update({
    where: { articleId },
    data: {
      ...(data.prixBase !== undefined && { prixBase: data.prixBase }),
      ...(data.prixM2 !== undefined && { prixM2: data.prixM2 }),
      ...(data.prixCm2 !== undefined && { prixCm2: data.prixCm2 }),
      ...(data.qtyMin !== undefined && { qtyMin: data.qtyMin }),
    },
  });
}

export async function replaceArticleDiscountTiers(
  articleId: string,
  tiers: TierInput[],
  opts?: { variantKey?: string },
) {
  const err = validateDiscountTiers(tiers);
  if (err) throw new Error(err);

  const variantKey = opts?.variantKey ?? tiers[0]?.variantKey ?? '';
  const variantLabel = tiers.find((t) => t.variantLabel)?.variantLabel ?? null;

  await prisma.$transaction([
    prisma.discountTier.deleteMany({ where: { articleId, variantKey } }),
    ...tiers.map((t) =>
      prisma.discountTier.create({
        data: {
          articleId,
          variantKey: t.variantKey ?? variantKey,
          variantLabel: t.variantLabel ?? variantLabel,
          minQty: t.minQty,
          maxQty: t.maxQty,
          unitPrice: t.unitPrice,
          discountPercent: t.discountPercent ?? 0,
          active: t.active !== false,
          source: 'admin-inline',
        },
      }),
    ),
  ]);

  return prisma.discountTier.findMany({
    where: { articleId, variantKey },
    orderBy: { minQty: 'asc' },
  });
}

/**
 * Enregistre une version brouillon de formule depuis le constructeur visuel.
 * N’altère pas les formules publiées tant que l’utilisateur ne publie pas l’article.
 */
export async function upsertFormulaFromBlocks(
  articleId: string,
  blocks: PriceBlock[],
  options?: { label?: string; simpleFormula?: string; source?: string },
) {
  const err = validatePriceBlocks(blocks);
  if (err) throw new Error(err);

  const profile = await prisma.articlePricingProfile.findUnique({ where: { articleId } });
  if (!profile) throw new Error('Profil introuvable');

  const expression = blocksToExpression(blocks);
  const source = options?.source ?? 'visual-price-builder';
  const variables = buildFormulaVariablesPayload(blocks, profile.calculationType, {
    simpleFormula: options?.simpleFormula,
    source,
  });
  const pipeline = {
    blocks,
    naturalLanguage: variables.naturalLanguage,
    source,
    ...(options?.simpleFormula ? { simpleFormula: options.simpleFormula } : {}),
  };

  const latest = await prisma.formulaVersion.findFirst({
    where: { articleId },
    orderBy: { version: 'desc' },
  });

  if (latest && latest.status === 'draft') {
    return prisma.formulaVersion.update({
      where: { id: latest.id },
      data: {
        expression,
        variables: variables as object,
        pipeline: pipeline as object,
        label: options?.label ?? latest.label ?? 'Constructeur visuel',
        source,
      },
    });
  }

  // Ne pas archiver la formule publiée : le POS continue dessus jusqu'à publish explicite.
  const nextVersion = (latest?.version ?? 0) + 1;

  return prisma.formulaVersion.create({
    data: {
      articleId,
      version: nextVersion,
      status: 'draft',
      label: options?.label ?? 'Constructeur visuel',
      expression,
      variables: variables as object,
      pipeline: pipeline as object,
      source,
    },
  });
}

/**
 * Met à jour l’expression textuelle (parcours Formules étape 10).
 * Conserve variables/blocs existants — le publish + sync POS projette ensuite.
 */
export async function upsertFormulaExpression(
  articleId: string,
  expression: string,
  options?: { label?: string },
) {
  const trimmed = String(expression ?? '').trim();
  if (!trimmed) throw new Error('Expression vide');
  if (trimmed.length > 8000) throw new Error('Expression trop longue (max 8000)');

  const profile = await prisma.articlePricingProfile.findUnique({ where: { articleId } });
  if (!profile) throw new Error('Profil introuvable');

  const latest = await prisma.formulaVersion.findFirst({
    where: { articleId },
    orderBy: { version: 'desc' },
  });

  const prevVars =
    latest?.variables && typeof latest.variables === 'object' && !Array.isArray(latest.variables)
      ? (latest.variables as Record<string, unknown>)
      : {};
  const variables = {
    ...prevVars,
    manualExpression: true,
    expressionEditedAt: new Date().toISOString(),
  };
  const prevPipeline =
    latest?.pipeline && typeof latest.pipeline === 'object' && !Array.isArray(latest.pipeline)
      ? (latest.pipeline as Record<string, unknown>)
      : {};
  const pipeline = {
    ...prevPipeline,
    source: 'expression-editor',
    expression: trimmed,
  };

  if (latest && latest.status === 'draft') {
    return prisma.formulaVersion.update({
      where: { id: latest.id },
      data: {
        expression: trimmed,
        variables: variables as object,
        pipeline: pipeline as object,
        label: options?.label ?? latest.label ?? 'Expression éditeur',
        source: 'expression-editor',
      },
    });
  }

  const nextVersion = (latest?.version ?? 0) + 1;
  return prisma.formulaVersion.create({
    data: {
      articleId,
      version: nextVersion,
      status: 'draft',
      label: options?.label ?? 'Expression éditeur',
      expression: trimmed,
      variables: variables as object,
      pipeline: pipeline as object,
      source: 'expression-editor',
    },
  });
}

export async function updateProductOptionGroup(
  groupId: string,
  articleId: string,
  data: Partial<{
    impactsPrice: boolean;
    impactsStock: boolean;
    impactsProduction: boolean;
    isInformational: boolean;
    visiblePos: boolean;
    active: boolean;
    required: boolean;
  }>,
) {
  const group = await prisma.productOptionGroup.findFirst({ where: { id: groupId, articleId } });
  if (!group) throw new Error('Groupe option introuvable');

  const flags = normalizeOptionFlags({
    impactsPrice: data.impactsPrice ?? group.impactsPrice,
    isInformational: data.isInformational ?? group.isInformational,
  });
  const impactPatched = data.impactsPrice !== undefined || data.isInformational !== undefined;
  const metadataWithManual = impactPatched
    ? writeManualPriceImpactOverride(group.metadata, flags)
    : ((group.metadata as Record<string, unknown> | null) ?? {});
  const impactStatus = resolveFieldPriceImpact({
    articleId,
    fieldKey: group.fieldKey,
    metadata: metadataWithManual,
    defaultImpactsPrice: flags.impactsPrice,
    defaultIsInformational: flags.isInformational,
  });
  const nextMetadata = mergePriceImpactMetadata(metadataWithManual, impactStatus);

  return prisma.productOptionGroup.update({
    where: { id: groupId },
    data: {
      ...(data.impactsStock !== undefined && { impactsStock: data.impactsStock }),
      ...(data.impactsProduction !== undefined && { impactsProduction: data.impactsProduction }),
      ...(data.visiblePos !== undefined && { visiblePos: data.visiblePos }),
      ...(data.active !== undefined && { active: data.active }),
      ...(data.required !== undefined && { required: data.required }),
      impactsPrice: impactStatus.impactsPrice,
      isInformational: impactStatus.isInformational,
      metadata: nextMetadata as object,
    },
  });
}

export async function updateProductOptionValue(
  valueId: string,
  groupId: string,
  data: Partial<{ priceModifier: number; forcePrice: boolean; active: boolean; label: string }>,
) {
  const value = await prisma.productOptionValue.findFirst({ where: { id: valueId, groupId } });
  if (!value) throw new Error('Valeur option introuvable');

  const dual =
    data.priceModifier !== undefined
      ? dualWriteOptionModifier(value.modifierType, data.priceModifier)
      : null;

  return prisma.productOptionValue.update({
    where: { id: valueId },
    data: {
      ...(dual && {
        priceModifier: dual.priceModifier,
        priceAddonAr: dual.priceAddonAr,
        priceMultiplier: dual.priceMultiplier,
      }),
      ...(data.forcePrice !== undefined && { forcePrice: data.forcePrice }),
      ...(data.active !== undefined && { active: data.active }),
      ...(data.label !== undefined && { label: data.label }),
    },
  });
}

export async function updateUrgencyRule(
  ruleId: string,
  articleId: string,
  data: Partial<{ label: string; surchargePercent: number; requiresValidation: boolean; active: boolean }>,
) {
  const rule = await prisma.urgencyRule.findFirst({ where: { id: ruleId, articleId } });
  if (!rule) throw new Error('Règle urgence introuvable');

  return prisma.urgencyRule.update({
    where: { id: ruleId },
    data: {
      ...(data.label !== undefined && { label: data.label }),
      ...(data.surchargePercent !== undefined && { surchargePercent: data.surchargePercent }),
      ...(data.requiresValidation !== undefined && { requiresValidation: data.requiresValidation }),
      ...(data.active !== undefined && { active: data.active }),
    },
  });
}

export async function updateMaterialPrice(
  materialId: string,
  articleId: string,
  data: Partial<{ prixM2: number | null; prixCm2: number | null; label: string; active: boolean }>,
) {
  const row = await prisma.materialPrice.findFirst({ where: { id: materialId, articleId } });
  if (!row) throw new Error('Prix matière introuvable');

  return prisma.materialPrice.update({
    where: { id: materialId },
    data: {
      ...(data.prixM2 !== undefined && { prixM2: data.prixM2 }),
      ...(data.prixCm2 !== undefined && { prixCm2: data.prixCm2 }),
      ...(data.label !== undefined && { label: data.label }),
      ...(data.active !== undefined && { active: data.active }),
    },
  });
}
