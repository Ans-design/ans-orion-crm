import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import {
  buildCommercialProjection,
  mergeCoherenceIntoVariables,
} from '@/lib/pricing/commercial-projection';
import { diagnoseOptionDependencies } from '@/lib/services/option-dependency.service';

export async function publishArticleDynamicPricing(articleId: string, userId?: string) {
  const profile = await prisma.articlePricingProfile.findUnique({
    where: { articleId },
    include: {
      optionGroups: {
        where: { active: true },
        select: { fieldKey: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
  if (!profile) throw new Error(`Profil tarifaire introuvable : ${articleId}`);

  const draftFormula = await prisma.formulaVersion.findFirst({
    where: { articleId },
    orderBy: { version: 'desc' },
  });
  if (!draftFormula) throw new Error(`Aucune formule pour ${articleId}`);

  const depIssues = await diagnoseOptionDependencies(articleId);
  const blocking = depIssues.filter((i) => i.severity === 'error');
  if (blocking.length > 0) {
    throw new Error(`Publication bloquée — dépendances: ${blocking[0].message}`);
  }

  const { hash, meta } = buildCommercialProjection({
    articleId: profile.articleId,
    articleLabel: profile.articleLabel,
    family: profile.family,
    calculationType: profile.calculationType,
    saleUnit: profile.saleUnit,
    prixBase: profile.prixBase,
    formula: {
      version: draftFormula.version,
      expression: draftFormula.expression,
      status: draftFormula.status,
    },
    optionFieldKeys: profile.optionGroups.map((g) => g.fieldKey),
  });

  const nextVariables = mergeCoherenceIntoVariables(draftFormula.variables, meta);

  await prisma.$transaction([
    prisma.formulaVersion.updateMany({
      where: { articleId, status: 'published' },
      data: { status: 'archived' },
    }),
    prisma.formulaVersion.update({
      where: { id: draftFormula.id },
      data: {
        status: 'published',
        publishedAt: new Date(),
        publishedBy: userId ?? null,
        variables: nextVariables as Prisma.InputJsonValue,
      },
    }),
    prisma.articlePricingProfile.update({
      where: { articleId },
      data: { status: 'published' },
    }),
  ]);

  try {
    const { invalidatePricingRuntimeCache } = await import('@/lib/pricing/pricing-runtime-cache');
    invalidatePricingRuntimeCache(`publish:${articleId}`);
  } catch {
    /* best-effort */
  }

  try {
    const { notifyAdminModuleMutation } = await import('@/lib/services/admin-data-sync.service');
    await notifyAdminModuleMutation('formulas', {
      userId,
      details: { articleId, formulaVersion: draftFormula.version, action: 'publish' },
    });
  } catch {
    /* best-effort */
  }

  return {
    articleId,
    formulaVersion: draftFormula.version,
    status: 'published' as const,
    projectionHash: hash,
  };
}

export async function unpublishArticleDynamicPricing(articleId: string) {
  // Archive les versions publiées (conserve l’historique) — ne les retransforme pas en draft.
  await prisma.$transaction([
    prisma.formulaVersion.updateMany({
      where: { articleId, status: 'published' },
      data: { status: 'archived' },
    }),
    prisma.articlePricingProfile.update({
      where: { articleId },
      data: { status: 'draft' },
    }),
  ]);
  try {
    const { invalidatePricingRuntimeCache } = await import('@/lib/pricing/pricing-runtime-cache');
    invalidatePricingRuntimeCache(`unpublish:${articleId}`);
  } catch {
    /* best-effort */
  }
  return { articleId, status: 'draft' as const };
}

export async function publishBulkArticleDynamicPricing(
  articleIds: string[],
  userId?: string,
): Promise<{ published: string[]; failed: { articleId: string; error: string }[] }> {
  const published: string[] = [];
  const failed: { articleId: string; error: string }[] = [];

  for (const articleId of articleIds) {
    try {
      await publishArticleDynamicPricing(articleId, userId);
      published.push(articleId);
    } catch (error) {
      failed.push({
        articleId,
        error: error instanceof Error ? error.message : 'Publication échouée',
      });
    }
  }

  return { published, failed };
}

export async function listDraftPricingArticleIds(limit = 200): Promise<string[]> {
  const rows = await prisma.articlePricingProfile.findMany({
    where: { status: { not: 'published' } },
    select: { articleId: true },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });
  return rows.map((r) => r.articleId);
}

export async function getDynamicPricingStats() {
  const [profiles, published, draft, optionGroups, formulas, stockRules, urgencyRules, materialPrices] =
    await Promise.all([
      prisma.articlePricingProfile.count(),
      prisma.articlePricingProfile.count({ where: { status: 'published' } }),
      prisma.articlePricingProfile.count({ where: { status: 'draft' } }),
      prisma.productOptionGroup.count(),
      prisma.formulaVersion.count(),
      prisma.stockRule.count(),
      prisma.urgencyRule.count(),
      prisma.materialPrice.count(),
    ]);
  return { profiles, published, draft, optionGroups, formulas, stockRules, urgencyRules, materialPrices };
}
