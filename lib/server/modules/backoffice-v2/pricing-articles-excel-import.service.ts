import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { findCatalogueItem } from '@/lib/data/catalogue-meta';
import {
  detectDuplicateExcelIds,
  duplicateExcelIdIssues,
  countDuplicateExcelIdSkips,
  type DuplicateExcelIdGroup,
} from '@/lib/backoffice/material-excel-duplicate-ids';
import {
  parsePricingArticleExcelRow,
  excelRowToPricingArticleCanonical,
  isFormuleRow,
  isPalierRow,
  type ParsedPricingExcelRow,
} from '@/lib/backoffice/pricing-articles-excel-format';
import { saveArticleTiers } from '@/lib/server/modules/backoffice-v2/admin-backoffice-tiers.service';
import type { TierMode } from '@/lib/server/modules/backoffice-v2/admin-backoffice-tiers.types';
import { notifyAdminModuleMutation } from '@/lib/services/admin-data-sync.service';

export type PricingArticlesImportReport = {
  read: number;
  created: number;
  updated: number;
  unchanged: number;
  ignored: number;
  errors: number;
  duplicateIds: number;
  duplicateIdGroups: DuplicateExcelIdGroup[];
  syncModeUsed: 'upsert';
  formulasUpdated: number;
  tiersUpdated: number;
  issues: Array<{ line: number; field?: string; reason: string }>;
};

const VALID_MODES = new Set<TierMode>([
  'unit_price', 'percent', 'fixed_discount', 'coefficient', 'total_band', 'formula',
]);

async function ensureArticleProfileForImport(
  articleId: string,
  label: string,
  family: string,
  calculationType: string,
  saleUnit: string,
) {
  const existing = await prisma.articlePricingProfile.findUnique({ where: { articleId } });
  if (existing) return existing;
  return prisma.articlePricingProfile.create({
    data: {
      articleId,
      articleLabel: label,
      family,
      calculationType,
      saleUnit,
      status: 'draft',
      active: true,
      source: 'excel-import',
    },
  });
}

async function upsertFormulaFromImport(
  articleId: string,
  expression: string,
  statusRaw: string,
): Promise<'created' | 'updated' | 'unchanged'> {
  const status = ['published', 'publié'].includes(statusRaw.toLowerCase()) ? 'published' : 'draft';
  const existing = await prisma.formulaVersion.findFirst({
    where: { articleId },
    orderBy: { version: 'desc' },
  });
  if (existing) {
    if (existing.expression === expression && existing.status === status) return 'unchanged';
    await prisma.formulaVersion.update({
      where: { id: existing.id },
      data: { expression, status, updatedAt: new Date() },
    });
    return 'updated';
  }
  await prisma.formulaVersion.create({
    data: {
      articleId,
      version: 1,
      expression,
      variables: {},
      status,
      source: 'excel-import',
    },
  });
  return 'created';
}

export async function importPricingArticlesFromExcel(
  rawLines: Record<string, unknown>[],
  opts?: { userId?: string; userName?: string; fileName?: string },
): Promise<PricingArticlesImportReport> {
  const duplicateIdGroups = detectDuplicateExcelIds(rawLines, excelRowToPricingArticleCanonical);
  const duplicateIssues = duplicateExcelIdIssues(duplicateIdGroups);

  const report: PricingArticlesImportReport = {
    read: rawLines.length,
    created: 0,
    updated: 0,
    unchanged: 0,
    ignored: 0,
    errors: 0,
    duplicateIds: countDuplicateExcelIdSkips(duplicateIdGroups),
    duplicateIdGroups,
    syncModeUsed: 'upsert',
    formulasUpdated: 0,
    tiersUpdated: 0,
    issues: [...duplicateIssues],
  };

  const skipIndexes = new Set<number>();
  for (const group of duplicateIdGroups) {
    for (let i = 1; i < group.entries.length; i++) {
      skipIndexes.add(group.entries[i]!.rowIndex);
    }
  }

  const prixByArticle = new Map<string, ParsedPricingExcelRow>();
  const tiersByArticle = new Map<string, ParsedPricingExcelRow[]>();
  const formulasByArticle = new Map<string, ParsedPricingExcelRow>();

  for (let i = 0; i < rawLines.length; i++) {
    if (skipIndexes.has(i)) {
      report.ignored += 1;
      continue;
    }
    const parsed = parsePricingArticleExcelRow(rawLines[i]!, i + 2);
    if (!parsed.articleId) {
      report.ignored += 1;
      report.issues.push({ line: parsed.lineNo, field: 'RÉFÉRENCE', reason: 'Article manquant' });
      continue;
    }
    if (parsed.rowType === 'PALIER') {
      const list = tiersByArticle.get(parsed.articleId) ?? [];
      list.push(parsed);
      tiersByArticle.set(parsed.articleId, list);
    } else if (parsed.rowType === 'FORMULE') {
      formulasByArticle.set(parsed.articleId, parsed);
    } else {
      prixByArticle.set(parsed.articleId, parsed);
    }
  }

  for (const [articleId, parsed] of prixByArticle) {
    try {
      const existing = await prisma.articlePricingProfile.findUnique({ where: { articleId } });
      const cat = findCatalogueItem(articleId);
      const label = parsed.articleLabel || cat?.name || articleId;
      const family = cat?.category ?? existing?.family ?? 'general';

      if (existing) {
        const same =
          (existing.prixBase ?? null) === parsed.prixBase
          && existing.calculationType === parsed.calculationType
          && existing.saleUnit === parsed.saleUnit;
        if (same) report.unchanged += 1;
        else {
          await prisma.articlePricingProfile.update({
            where: { articleId },
            data: {
              prixBase: parsed.prixBase,
              calculationType: parsed.calculationType,
              saleUnit: parsed.saleUnit,
              status: 'draft',
            },
          });
          report.updated += 1;
        }
      } else {
        await ensureArticleProfileForImport(
          articleId,
          label,
          family,
          parsed.calculationType,
          parsed.saleUnit,
        );
        if (parsed.prixBase != null) {
          await prisma.articlePricingProfile.update({
            where: { articleId },
            data: { prixBase: parsed.prixBase },
          });
        }
        report.created += 1;
      }
    } catch (e) {
      report.errors += 1;
      report.issues.push({
        line: parsed.lineNo,
        reason: e instanceof Error ? e.message : 'Erreur prix article',
      });
    }
  }

  for (const [articleId, parsed] of formulasByArticle) {
    if (!isFormuleRow(parsed)) {
      report.ignored += 1;
      continue;
    }
    try {
      const cat = findCatalogueItem(articleId);
      await ensureArticleProfileForImport(
        articleId,
        parsed.articleLabel || cat?.name || articleId,
        cat?.category ?? 'general',
        'formula',
        parsed.saleUnit,
      );
      const outcome = await upsertFormulaFromImport(
        articleId,
        parsed.formulaExpression,
        parsed.formulaStatus ?? parsed.publicationStatus,
      );
      if (outcome === 'unchanged') report.unchanged += 1;
      else {
        report.formulasUpdated += 1;
        if (outcome === 'created') report.created += 1;
        else report.updated += 1;
      }
    } catch (e) {
      report.errors += 1;
      report.issues.push({
        line: parsed.lineNo,
        reason: e instanceof Error ? e.message : 'Erreur formule',
      });
    }
  }

  for (const [articleId, lines] of tiersByArticle) {
    const palierLines = lines.filter(isPalierRow);
    if (!palierLines.length) {
      report.ignored += lines.length;
      continue;
    }
    const modeRaw = palierLines.find((l) => l.tierMode)?.tierMode ?? 'unit_price';
    const tierMode = (VALID_MODES.has(modeRaw as TierMode) ? modeRaw : 'unit_price') as TierMode;
    const saleUnit = palierLines.find((l) => l.saleUnit)?.saleUnit ?? undefined;

    const tiers = palierLines
      .filter((l) => (l.tierMinQty ?? 0) > 0)
      .map((l) => {
        if (tierMode === 'percent') {
          return {
            minQty: l.tierMinQty ?? 1,
            maxQty: l.tierMaxQty,
            unitPrice: null,
            discountPercent: l.tierValue ?? 0,
            active: l.tierActive,
          };
        }
        return {
          minQty: l.tierMinQty ?? 1,
          maxQty: l.tierMaxQty,
          unitPrice: l.tierValue,
          discountPercent: 0,
          active: l.tierActive,
        };
      });

    if (!tiers.length) {
      report.ignored += lines.length;
      continue;
    }

    try {
      const cat = findCatalogueItem(articleId);
      const first = palierLines[0]!;
      await ensureArticleProfileForImport(
        articleId,
        first.articleLabel || cat?.name || articleId,
        cat?.category ?? 'general',
        'piece',
        saleUnit ?? 'pièce',
      );
      await saveArticleTiers(articleId, { tierMode, tiers, saleUnit });
      report.tiersUpdated += 1;
      report.updated += 1;
    } catch (e) {
      report.errors += 1;
      report.issues.push({
        line: palierLines[0]!.lineNo,
        reason: e instanceof Error ? e.message : 'Erreur paliers',
      });
    }
  }

  await logAudit({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'IMPORT',
    entity: 'ArticlePricingProfile',
    entityLabel: opts?.fileName ?? 'import-excel',
    details: report,
  });

  await notifyAdminModuleMutation('pricing-articles', {
    userId: opts?.userId,
    userName: opts?.userName,
    details: { import: report },
  });

  return report;
}
