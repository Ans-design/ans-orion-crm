/**
 * Répare les familles / catégories POS mal classées (source DB).
 * Corrige ArticlePricingProfile + DirectSaleArticle pour que F5 ne ramène pas les erreurs.
 */
import { prisma } from '@/lib/prisma';
import {
  canonicalFamilyLabel,
  suggestCorrectCategory,
  validateArticleCategory,
  type CategoryValidationIssue,
} from '@/lib/pos/article-category-taxonomy';

export type CategoryRepairRow = {
  articleId: string;
  label: string;
  oldFamily: string | null;
  newFamily: string;
  source: 'profile' | 'direct-sale';
  issues: CategoryValidationIssue[];
};

export type CategoryRepairResult = {
  scanned: number;
  repaired: number;
  unchanged: number;
  rows: CategoryRepairRow[];
};

/**
 * Corrige les familles incohérentes sur les profils tarifaires et articles vente directe.
 * Non destructif hors champ family/category.
 */
export async function repairMisclassifiedPosCategories(
  opts?: { dryRun?: boolean },
): Promise<CategoryRepairResult> {
  const dryRun = opts?.dryRun === true;
  const rows: CategoryRepairRow[] = [];
  let scanned = 0;
  let repaired = 0;
  let unchanged = 0;

  const profiles = await prisma.articlePricingProfile.findMany({
    select: { articleId: true, articleLabel: true, family: true },
  });

  for (const p of profiles) {
    scanned += 1;
    const validation = validateArticleCategory({
      articleId: p.articleId,
      name: p.articleLabel,
      family: p.family,
    });
    const suggestedId = validation.suggestedCategoryId;
    const newFamily = canonicalFamilyLabel(suggestedId);
    const old = (p.family ?? '').trim();
    const needsFix = !validation.ok || old !== newFamily;

    if (!needsFix) {
      unchanged += 1;
      continue;
    }

    rows.push({
      articleId: p.articleId,
      label: p.articleLabel,
      oldFamily: p.family,
      newFamily,
      source: 'profile',
      issues: validation.issues,
    });

    if (!dryRun) {
      await prisma.articlePricingProfile.update({
        where: { articleId: p.articleId },
        data: { family: newFamily, updatedAt: new Date() },
      });
    }
    repaired += 1;
  }

  try {
    const dsArticles = await prisma.directSaleArticle.findMany({
      select: { id: true, name: true, category: true, reference: true, slug: true },
    });
    for (const a of dsArticles) {
      scanned += 1;
      const articleId = a.reference?.trim() || a.slug;
      const validation = validateArticleCategory({
        articleId,
        name: a.name,
        family: a.category,
        category: a.category,
      });
      const suggestedId = validation.suggestedCategoryId;
      const newFamily = canonicalFamilyLabel(suggestedId);
      const old = (a.category ?? '').trim();
      if (validation.ok && old === newFamily) {
        unchanged += 1;
        continue;
      }
      rows.push({
        articleId,
        label: a.name,
        oldFamily: a.category,
        newFamily,
        source: 'direct-sale',
        issues: validation.issues,
      });
      if (!dryRun) {
        await prisma.directSaleArticle.update({
          where: { id: a.id },
          data: { category: newFamily, updatedAt: new Date() },
        });
      }
      repaired += 1;
    }
  } catch {
    /* table absente */
  }

  return { scanned, repaired, unchanged, rows };
}

/** Anomalies « Article mal catégorisé » pour Admin. */
export async function listMisclassifiedCategoryAnomalies(): Promise<
  Array<{
    severity: 'warning';
    kind: 'misclassified_category';
    message: string;
    articleId: string;
    oldFamily: string | null;
    suggestedFamily: string;
  }>
> {
  const result = await repairMisclassifiedPosCategories({ dryRun: true });
  return result.rows
    .filter((r) => r.source === 'profile')
    .map((r) => ({
      severity: 'warning' as const,
      kind: 'misclassified_category' as const,
      message:
        r.issues[0]?.message ??
        `${r.label} est mal catégorisé (${r.oldFamily ?? '—'} → ${r.newFamily})`,
      articleId: r.articleId,
      oldFamily: r.oldFamily,
      suggestedFamily: r.newFamily,
    }));
}
