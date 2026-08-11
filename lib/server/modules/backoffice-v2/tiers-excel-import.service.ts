import { logAudit } from '@/lib/audit';
import {
  detectDuplicateExcelIds,
  duplicateExcelIdIssues,
  countDuplicateExcelIdSkips,
  type DuplicateExcelIdGroup,
} from '@/lib/backoffice/material-excel-duplicate-ids';
import {
  parseTierExcelRow,
  excelRowToTierCanonical,
} from '@/lib/backoffice/tiers-excel-format';
import { saveArticleTiers } from '@/lib/server/modules/backoffice-v2/admin-backoffice-tiers.service';
import type { TierMode } from '@/lib/server/modules/backoffice-v2/admin-backoffice-tiers.types';

export type TiersImportReport = {
  read: number;
  created: number;
  updated: number;
  unchanged: number;
  ignored: number;
  errors: number;
  duplicateIds: number;
  duplicateIdGroups: DuplicateExcelIdGroup[];
  syncModeUsed: 'upsert';
  issues: Array<{ line: number; field?: string; reason: string }>;
};

const VALID_MODES = new Set<TierMode>([
  'unit_price', 'percent', 'fixed_discount', 'coefficient', 'total_band', 'formula',
]);

export async function importTiersFromExcel(
  rawLines: Record<string, unknown>[],
  opts?: { userId?: string; userName?: string; fileName?: string },
): Promise<TiersImportReport> {
  const duplicateIdGroups = detectDuplicateExcelIds(rawLines, excelRowToTierCanonical);
  const duplicateIssues = duplicateExcelIdIssues(duplicateIdGroups);

  const report: TiersImportReport = {
    read: rawLines.length,
    created: 0,
    updated: 0,
    unchanged: 0,
    ignored: 0,
    errors: 0,
    duplicateIds: countDuplicateExcelIdSkips(duplicateIdGroups),
    duplicateIdGroups,
    syncModeUsed: 'upsert',
    issues: [...duplicateIssues],
  };

  const skipIndexes = new Set<number>();
  for (const group of duplicateIdGroups) {
    for (let i = 1; i < group.entries.length; i++) {
      skipIndexes.add(group.entries[i]!.rowIndex);
    }
  }

  const byArticle = new Map<string, ReturnType<typeof parseTierExcelRow>[]>();

  for (let i = 0; i < rawLines.length; i++) {
    if (skipIndexes.has(i)) {
      report.ignored += 1;
      continue;
    }
    const parsed = parseTierExcelRow(rawLines[i]!, i + 2);
    if (!parsed.articleId) {
      report.ignored += 1;
      report.issues.push({ line: parsed.lineNo, field: 'RÉFÉRENCE', reason: 'Article manquant' });
      continue;
    }
    const list = byArticle.get(parsed.articleId) ?? [];
    list.push(parsed);
    byArticle.set(parsed.articleId, list);
  }

  for (const [articleId, lines] of byArticle) {
    const modeRaw = lines.find((l) => l.mode)?.mode ?? 'unit_price';
    const tierMode = (VALID_MODES.has(modeRaw as TierMode) ? modeRaw : 'unit_price') as TierMode;
    const saleUnit = lines.find((l) => l.saleUnit)?.saleUnit ?? undefined;

    const tiers = lines
      .filter((l) => l.minQty > 0)
      .map((l) => {
        if (tierMode === 'percent') {
          return {
            minQty: l.minQty,
            maxQty: l.maxQty,
            unitPrice: null,
            discountPercent: l.value ?? 0,
            active: l.active,
          };
        }
        return {
          minQty: l.minQty,
          maxQty: l.maxQty,
          unitPrice: l.value,
          discountPercent: 0,
          active: l.active,
        };
      });

    if (!tiers.length) {
      report.ignored += lines.length;
      continue;
    }

    try {
      await saveArticleTiers(articleId, { tierMode, tiers, saleUnit });
      report.updated += 1;
    } catch (e) {
      report.errors += 1;
      report.issues.push({
        line: lines[0]!.lineNo,
        reason: e instanceof Error ? e.message : 'Erreur paliers',
      });
    }
  }

  await logAudit({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'IMPORT',
    entity: 'DiscountTier',
    entityLabel: opts?.fileName ?? 'import-excel',
    details: report,
  });

  return report;
}
