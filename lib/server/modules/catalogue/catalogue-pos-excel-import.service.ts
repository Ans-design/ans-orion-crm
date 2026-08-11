import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import {
  parseCatalogueExcelRow,
  excelRowToCatalogueCanonical,
} from '@/lib/backoffice/catalogue-pos-excel-format';
import { updateBackofficeArticle } from '@/lib/services/backoffice-article-service';
import {
  countDuplicateExcelIdSkips,
  detectDuplicateExcelIds,
  duplicateExcelIdIssues,
  type DuplicateExcelIdGroup,
} from '@/lib/backoffice/material-excel-duplicate-ids';
import { formatExcelRowId } from '@/lib/backoffice/material-main-reference';

const EXCEL_IDS_KEY = 'catalogue-pos-excel-ids-v1';

export type CatalogueImportReport = {
  read: number;
  created: number;
  updated: number;
  unchanged: number;
  ignored: number;
  errors: number;
  duplicateIds: number;
  duplicateIdGroups: DuplicateExcelIdGroup[];
  exportOnlyColumnsIgnored: number;
  syncModeUsed: 'upsert';
  issues: Array<{ line: number; field?: string; reason: string }>;
};

async function loadExcelIdMap(): Promise<Record<string, string>> {
  const row = await prisma.systemConfig.findUnique({ where: { configKey: EXCEL_IDS_KEY } });
  const data = row?.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  return data as Record<string, string>;
}

async function saveExcelIdMap(map: Record<string, string>) {
  await prisma.systemConfig.upsert({
    where: { configKey: EXCEL_IDS_KEY },
    create: { configKey: EXCEL_IDS_KEY, data: map },
    update: { data: map },
  });
}

export async function getCatalogueExcelRowId(articleId: string): Promise<string | null> {
  const map = await loadExcelIdMap();
  return map[articleId] ?? null;
}

/** Assigne IDs Excel 001, 002… aux articles catalogue */
export async function ensureCatalogueExcelRowIds(): Promise<{
  assigned: number;
  preserved: number;
  ids: Record<string, string>;
}> {
  const profiles = await prisma.articlePricingProfile.findMany({
    orderBy: [{ articleLabel: 'asc' }],
    select: { articleId: true },
  });
  const map = await loadExcelIdMap();
  const used = new Set(Object.values(map));
  let maxNum = 0;
  for (const id of used) {
    const n = parseInt(id, 10);
    if (!Number.isNaN(n)) maxNum = Math.max(maxNum, n);
  }

  let assigned = 0;
  let preserved = 0;
  for (const p of profiles) {
    if (map[p.articleId]) {
      preserved += 1;
      continue;
    }
    maxNum += 1;
    map[p.articleId] = formatExcelRowId(maxNum);
    assigned += 1;
  }
  if (assigned > 0) await saveExcelIdMap(map);
  return { assigned, preserved, ids: map };
}

export async function importCataloguePosFromExcel(
  rawLines: Record<string, unknown>[],
  opts?: { userId?: string; userName?: string; fileName?: string },
): Promise<CatalogueImportReport> {
  const duplicateIdGroups = detectDuplicateExcelIds(rawLines, excelRowToCatalogueCanonical);
  const duplicateIssues = duplicateExcelIdIssues(duplicateIdGroups);

  const report: CatalogueImportReport = {
    read: rawLines.length,
    created: 0,
    updated: 0,
    unchanged: 0,
    ignored: 0,
    errors: 0,
    duplicateIds: countDuplicateExcelIdSkips(duplicateIdGroups),
    duplicateIdGroups,
    exportOnlyColumnsIgnored: 0,
    syncModeUsed: 'upsert',
    issues: [...duplicateIssues],
  };

  const skipIndexes = new Set<number>();
  for (const group of duplicateIdGroups) {
    for (let i = 1; i < group.entries.length; i++) {
      skipIndexes.add(group.entries[i]!.rowIndex);
    }
  }

  const profiles = await prisma.articlePricingProfile.findMany({
    select: { articleId: true, articleLabel: true, active: true, status: true, family: true },
  });
  const byId = new Map(profiles.map((p) => [p.articleId, p]));
  const byLabel = new Map(profiles.map((p) => [p.articleLabel.trim().toLowerCase(), p]));
  const excelMap = await loadExcelIdMap();
  const byExcelId = new Map(Object.entries(excelMap).map(([articleId, excelId]) => [excelId, articleId]));

  for (let i = 0; i < rawLines.length; i++) {
    if (skipIndexes.has(i)) {
      report.ignored += 1;
      continue;
    }

    const parsed = parseCatalogueExcelRow(rawLines[i]!, i);
    if (parsed.hadExportOnlyColumns) {
      report.exportOnlyColumnsIgnored += 1;
    }
    const articleId =
      (parsed.excelRowId ? byExcelId.get(parsed.excelRowId) : undefined)
      ?? (parsed.articleId ? byId.get(parsed.articleId)?.articleId : undefined)
      ?? (parsed.articleLabel ? byLabel.get(parsed.articleLabel.toLowerCase())?.articleId : undefined);

    if (!articleId) {
      report.ignored += 1;
      report.issues.push({
        line: parsed.lineNo,
        reason: `Article introuvable : ${parsed.articleLabel || parsed.articleId || '—'}`,
      });
      continue;
    }

    const target = byId.get(articleId)!;

    try {
      const profilePatch: { active?: boolean; status?: string; family?: string } = {};
      if (parsed.active !== target.active) profilePatch.active = parsed.active;
      if (parsed.status && parsed.status !== target.status) profilePatch.status = parsed.status;
      if (parsed.family && parsed.family !== target.family) profilePatch.family = parsed.family;

      const groups = await prisma.productOptionGroup.findMany({
        where: { articleId },
        select: { id: true, visiblePos: true },
      });
      const needsPosUpdate = groups.some((g) => g.visiblePos !== parsed.visiblePos);

      if (!Object.keys(profilePatch).length && !needsPosUpdate) {
        report.unchanged += 1;
        continue;
      }

      if (Object.keys(profilePatch).length) {
        await updateBackofficeArticle(articleId, profilePatch);
      }
      if (needsPosUpdate && groups.length > 0) {
        await prisma.productOptionGroup.updateMany({
          where: { articleId },
          data: { visiblePos: parsed.visiblePos },
        });
      }

      // Miroir DirectSale si référence liée
      try {
        await prisma.directSaleArticle.updateMany({
          where: {
            OR: [{ reference: articleId }, { slug: articleId.replace(/^ds-/, '') }],
          },
          data: { category: parsed.family, visiblePOS: parsed.visiblePos },
        });
      } catch {
        /* ignore */
      }

      if (parsed.excelRowId) {
        excelMap[articleId] = parsed.excelRowId;
        await saveExcelIdMap(excelMap);
      }

      report.updated += 1;
    } catch (e) {
      report.errors += 1;
      report.issues.push({
        line: parsed.lineNo,
        reason: e instanceof Error ? e.message : 'Erreur import',
      });
    }
  }

  await logAudit({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'IMPORT_EXCEL',
    entity: 'ArticlePricingProfile',
    entityLabel: 'Catalogue & POS',
    details: { module: 'Catalogue & POS', fileName: opts?.fileName, ...report, issues: report.issues.slice(0, 30) },
  });

  return report;
}
