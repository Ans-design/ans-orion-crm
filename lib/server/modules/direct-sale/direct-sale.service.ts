import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { formatExcelRowId } from '@/lib/backoffice/material-main-reference';
import {
  parseDirectSaleExcelRow,
  parseDirectSaleTierExcelRow,
  directSaleToExcelRow,
  directSaleTierToExcelRow,
} from '@/lib/backoffice/direct-sale-excel-format';
import { slugifyDirectSaleName, normalizeDirectSaleCategory } from '@/lib/direct-sale/categories';
import {
  syncDirectSaleArticleToPos,
  syncAllPublishedDirectSaleToPos,
} from '@/lib/services/direct-sale-pos-sync.service';

export type DirectSaleImportReport = {
  read: number;
  created: number;
  updated: number;
  unchanged: number;
  ignored: number;
  errors: number;
  synced: number;
  issues: Array<{ line: number; reason: string }>;
};

async function findArticleByExcelOrRef(excelId: string | null, reference: string | null, name: string) {
  if (excelId) {
    const byExcel = await prisma.directSaleArticle.findFirst({ where: { excelId } });
    if (byExcel) return byExcel;
  }
  if (reference) {
    const byRef = await prisma.directSaleArticle.findFirst({ where: { reference } });
    if (byRef) return byRef;
  }
  return prisma.directSaleArticle.findFirst({ where: { slug: slugifyDirectSaleName(name) } });
}

export async function importDirectSaleArticlesFromExcel(
  rawLines: Record<string, unknown>[],
  opts?: { userId?: string; userName?: string; fileName?: string },
): Promise<DirectSaleImportReport> {
  const report: DirectSaleImportReport = {
    read: rawLines.length,
    created: 0,
    updated: 0,
    unchanged: 0,
    ignored: 0,
    errors: 0,
    synced: 0,
    issues: [],
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = i + 2;
    const parsed = parseDirectSaleExcelRow(rawLines[i]!, line);
    if ('error' in parsed) {
      report.errors += 1;
      report.issues.push({ line, reason: parsed.error ?? 'Erreur ligne' });
      continue;
    }

    const data = parsed.row;
    const { isRedundantTiragePhotoArticle } = await import(
      '@/lib/services/merge-photo-print-articles.service'
    );
    if (isRedundantTiragePhotoArticle(data.name, data.reference)) {
      report.ignored += 1;
      report.issues.push({
        line,
        reason: `Variante format « ${data.name} » ignorée — utiliser l'article unique Tirage photo (ph-tirage)`,
      });
      continue;
    }

    // Taxonomie POS officielle (évite grand_format_std / cartes…)
    const catNorm = normalizeDirectSaleCategory({
      category: data.category,
      name: data.name,
      reference: data.reference,
    });
    data.category = catNorm.categoryLabel;

    if (!data.unitPrice && data.status !== 'draft') {
      report.ignored += 1;
      report.issues.push({ line, reason: 'Prix unitaire manquant — ligne ignorée' });
      continue;
    }

    try {
      const existing = await findArticleByExcelOrRef(data.excelId, data.reference, data.name);
      const excelId = data.excelId ?? existing?.excelId ?? formatExcelRowId(i + 1);

      if (existing) {
        const changed =
          existing.name !== data.name
          || existing.unitPrice !== data.unitPrice
          || existing.status !== data.status
          || existing.visiblePOS !== data.visiblePOS
          || existing.category !== data.category;

        if (!changed) {
          report.unchanged += 1;
        } else {
          await prisma.directSaleArticle.update({
            where: { id: existing.id },
            data: {
              ...data,
              excelId,
              slug: existing.slug,
              updatedAt: new Date(),
            },
          });
          report.updated += 1;
        }

        if (data.status === 'published') {
          await syncDirectSaleArticleToPos(existing.id, opts);
          report.synced += 1;
        }
      } else {
        const created = await prisma.directSaleArticle.create({
          data: {
            ...data,
            excelId,
            slug: slugifyDirectSaleName(data.name),
          },
        });
        report.created += 1;
        if (data.status === 'published') {
          await syncDirectSaleArticleToPos(created.id, opts);
          report.synced += 1;
        }
      }
    } catch (e) {
      report.errors += 1;
      report.issues.push({
        line,
        reason: e instanceof Error ? e.message : 'Erreur enregistrement',
      });
    }
  }

  await logAudit({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'IMPORT',
    entity: 'DirectSaleArticle',
    entityLabel: opts?.fileName ?? 'excel',
    details: report,
  });

  return report;
}

export async function exportDirectSaleArticlesToExcelRows() {
  const rows = await prisma.directSaleArticle.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  return rows.map((r) => directSaleToExcelRow(r));
}

export async function importDirectSaleTiersFromExcel(
  rawLines: Record<string, unknown>[],
  opts?: { userId?: string; userName?: string },
): Promise<DirectSaleImportReport> {
  const report: DirectSaleImportReport = {
    read: rawLines.length,
    created: 0,
    updated: 0,
    unchanged: 0,
    ignored: 0,
    errors: 0,
    synced: 0,
    issues: [],
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = i + 2;
    const parsed = parseDirectSaleTierExcelRow(rawLines[i]!, line);
    if ('error' in parsed) {
      report.errors += 1;
      report.issues.push({ line, reason: parsed.error ?? 'Erreur ligne' });
      continue;
    }

    const data = parsed.row;
    const article = await prisma.directSaleArticle.findFirst({
      where: {
        OR: [
          ...(data.articleRef ? [{ excelId: data.articleRef }, { reference: data.articleRef }] : []),
          ...(data.articleName ? [{ name: data.articleName }] : []),
        ],
      },
    });

    if (!article) {
      report.errors += 1;
      report.issues.push({ line, reason: `Article introuvable : ${data.articleName || data.articleRef}` });
      continue;
    }

    try {
      const existing = await prisma.directSalePriceTier.findFirst({
        where: { articleId: article.id, minQty: data.minQty },
      });

      if (existing) {
        await prisma.directSalePriceTier.update({
          where: { id: existing.id },
          data: {
            maxQty: data.maxQty,
            discountType: data.discountType,
            discountValue: data.discountValue,
            finalUnitPrice: data.finalUnitPrice,
            label: data.label,
            active: data.active,
          },
        });
        report.updated += 1;
      } else {
        await prisma.directSalePriceTier.create({
          data: {
            articleId: article.id,
            minQty: data.minQty,
            maxQty: data.maxQty,
            discountType: data.discountType,
            discountValue: data.discountValue,
            finalUnitPrice: data.finalUnitPrice,
            label: data.label,
            active: data.active,
            sortOrder: data.minQty,
          },
        });
        report.created += 1;
      }

      if (article.status === 'published') {
        await syncDirectSaleArticleToPos(article.id, opts);
        report.synced += 1;
      }
    } catch (e) {
      report.errors += 1;
      report.issues.push({ line, reason: e instanceof Error ? e.message : 'Erreur palier' });
    }
  }

  return report;
}

export async function listDirectSaleArticles(filters?: { status?: string; category?: string }) {
  return prisma.directSaleArticle.findMany({
    where: {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.category ? { category: filters.category } : {}),
    },
    include: {
      priceTiers: { where: { active: true }, orderBy: { minQty: 'asc' } },
      _count: { select: { addons: true } },
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
}

export async function publishAndSyncDirectSale(
  id: string,
  opts?: { userId?: string; userName?: string },
) {
  const article = await prisma.directSaleArticle.findUnique({ where: { id } });
  if (article) {
    const { isRedundantTiragePhotoArticle } = await import(
      '@/lib/services/merge-photo-print-articles.service'
    );
    if (isRedundantTiragePhotoArticle(article.name, article.reference ?? article.slug)) {
      await prisma.directSaleArticle.update({
        where: { id },
        data: { status: 'archived', visiblePOS: false },
      });
      return null;
    }
  }
  await prisma.directSaleArticle.update({
    where: { id },
    data: { status: 'published', updatedAt: new Date() },
  });
  return syncDirectSaleArticleToPos(id, { ...opts, preferArticlePrice: true });
}

export { syncAllPublishedDirectSaleToPos };

export async function listDirectSaleAddons(articleId: string) {
  return prisma.directSaleAddon.findMany({
    where: { articleId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
}

export async function createDirectSaleAddon(
  articleId: string,
  data: { name: string; price?: number; unit?: string; required?: boolean; visiblePOS?: boolean },
  opts?: { userId?: string; userName?: string },
) {
  const addon = await prisma.directSaleAddon.create({
    data: {
      articleId,
      name: data.name.trim(),
      price: data.price ?? 0,
      unit: data.unit ?? 'pièce',
      required: data.required ?? false,
      visiblePOS: data.visiblePOS !== false,
      sortOrder: await prisma.directSaleAddon.count({ where: { articleId } }),
    },
  });
  const article = await prisma.directSaleArticle.findUnique({
    where: { id: articleId },
    select: { status: true },
  });
  if (article?.status === 'published') {
    await syncDirectSaleArticleToPos(articleId, opts);
  }
  return addon;
}

export async function updateDirectSaleAddon(
  addonId: string,
  data: Partial<{ name: string; price: number; unit: string; required: boolean; visiblePOS: boolean; active: boolean }>,
  opts?: { userId?: string; userName?: string },
) {
  const addon = await prisma.directSaleAddon.update({
    where: { id: addonId },
    data: { ...data, updatedAt: new Date() },
  });
  const article = await prisma.directSaleArticle.findUnique({
    where: { id: addon.articleId },
    select: { status: true },
  });
  if (article?.status === 'published') {
    await syncDirectSaleArticleToPos(addon.articleId, opts);
  }
  return addon;
}

export async function archiveDirectSaleAddon(
  addonId: string,
  opts?: { userId?: string; userName?: string },
) {
  const addon = await prisma.directSaleAddon.update({
    where: { id: addonId },
    data: { active: false, visiblePOS: false, updatedAt: new Date() },
  });
  const article = await prisma.directSaleArticle.findUnique({
    where: { id: addon.articleId },
    select: { status: true },
  });
  if (article?.status === 'published') {
    await syncDirectSaleArticleToPos(addon.articleId, opts);
  }
  return addon;
}

export async function listDirectSaleTiersForArticle(articleId: string) {
  return prisma.directSalePriceTier.findMany({
    where: { articleId, active: true },
    orderBy: [{ sortOrder: 'asc' }, { minQty: 'asc' }],
  });
}

export async function listAllDirectSaleTiersFlat() {
  return prisma.directSalePriceTier.findMany({
    where: { active: true },
    include: {
      article: {
        select: {
          id: true,
          excelId: true,
          name: true,
          reference: true,
          unitPrice: true,
          unit: true,
          status: true,
          visiblePOS: true,
        },
      },
    },
    orderBy: [{ article: { name: 'asc' } }, { minQty: 'asc' }],
  });
}

export async function exportDirectSaleTiersToExcelRows() {
  const rows = await listAllDirectSaleTiersFlat();
  return rows.map((tier, index) =>
    directSaleTierToExcelRow(tier, tier.article, formatExcelRowId(index + 1)),
  );
}

async function syncArticleTiersIfPublished(articleId: string, opts?: { userId?: string; userName?: string }) {
  const article = await prisma.directSaleArticle.findUnique({
    where: { id: articleId },
    select: { status: true },
  });
  if (article?.status === 'published') {
    await syncDirectSaleArticleToPos(articleId, opts);
  }
}

export async function createDirectSaleTier(
  articleId: string,
  data: {
    minQty: number;
    maxQty?: number | null;
    discountType?: string;
    discountValue?: number;
    finalUnitPrice?: number | null;
    label?: string | null;
  },
  opts?: { userId?: string; userName?: string },
) {
  const tier = await prisma.directSalePriceTier.create({
    data: {
      articleId,
      minQty: data.minQty,
      maxQty: data.maxQty ?? null,
      discountType: data.discountType ?? 'unit_price',
      discountValue: data.discountValue ?? 0,
      finalUnitPrice: data.finalUnitPrice ?? null,
      label: data.label?.trim() || null,
      sortOrder: data.minQty,
      active: true,
    },
  });
  await syncArticleTiersIfPublished(articleId, opts);
  return tier;
}

export async function updateDirectSaleTier(
  tierId: string,
  data: Partial<{
    minQty: number;
    maxQty: number | null;
    discountType: string;
    discountValue: number;
    finalUnitPrice: number | null;
    label: string | null;
  }>,
  opts?: { userId?: string; userName?: string },
) {
  const tier = await prisma.directSalePriceTier.update({
    where: { id: tierId },
    data: { ...data, updatedAt: new Date() },
  });
  await syncArticleTiersIfPublished(tier.articleId, opts);
  return tier;
}

export async function archiveDirectSaleTier(
  tierId: string,
  opts?: { userId?: string; userName?: string },
) {
  const tier = await prisma.directSalePriceTier.update({
    where: { id: tierId },
    data: { active: false, updatedAt: new Date() },
  });
  await syncArticleTiersIfPublished(tier.articleId, opts);
  return tier;
}
