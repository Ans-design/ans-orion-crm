import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { isPrismaReglesReady } from '@/lib/regles-catalog';
import {
  assignBusinessRuleExcelIds,
  parseBusinessRuleExcelRow,
  excelRowToRuleCanonical,
} from '@/lib/backoffice/business-rules-excel-format';
import {
  countDuplicateExcelIdSkips,
  detectDuplicateExcelIds,
  duplicateExcelIdIssues,
  type DuplicateExcelIdGroup,
} from '@/lib/backoffice/material-excel-duplicate-ids';

const EXCEL_IDS_KEY = 'business-rules-excel-ids-v1';

export type BusinessRulesImportReport = {
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

export async function ensureBusinessRuleExcelRowIds(): Promise<{
  assigned: number;
  preserved: number;
  ids: Record<string, string>;
}> {
  if (!isPrismaReglesReady(prisma)) {
    return { assigned: 0, preserved: 0, ids: {} };
  }
  const rules = await prisma.businessRule.findMany({
    orderBy: [{ priority: 'asc' }, { ruleName: 'asc' }],
    select: { id: true },
  });
  const map = await loadExcelIdMap();
  const result = assignBusinessRuleExcelIds(rules, map);
  if (result.assigned > 0) await saveExcelIdMap(result.map);
  return { assigned: result.assigned, preserved: result.preserved, ids: result.map };
}

export async function importBusinessRulesFromExcel(
  rawLines: Record<string, unknown>[],
  opts?: { userId?: string; userName?: string; fileName?: string },
): Promise<BusinessRulesImportReport> {
  if (!isPrismaReglesReady(prisma)) {
    throw new Error('Base indisponible — import impossible en mode catalogue HTML');
  }

  const duplicateIdGroups = detectDuplicateExcelIds(rawLines, excelRowToRuleCanonical);
  const duplicateIssues = duplicateExcelIdIssues(duplicateIdGroups);

  const report: BusinessRulesImportReport = {
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

  const excelIdMap = await loadExcelIdMap();
  const byKey = new Map(
    (await prisma.businessRule.findMany()).map((r) => [r.ruleKey.toLowerCase(), r]),
  );
  const byId = new Map(
    (await prisma.businessRule.findMany()).map((r) => [r.id, r]),
  );

  for (let i = 0; i < rawLines.length; i++) {
    if (skipIndexes.has(i)) {
      report.ignored += 1;
      continue;
    }

    const line = rawLines[i]!;
    const lineNo = i + 2;
    const parsed = parseBusinessRuleExcelRow(line, lineNo);

    if (!parsed.ruleKey && !parsed.ruleName) {
      report.ignored += 1;
      report.issues.push({ line: lineNo, field: 'CLÉ', reason: 'Clé ou nom règle manquant' });
      continue;
    }

    const ruleKey = parsed.ruleKey || `rule-${parsed.ruleName.toLowerCase().replace(/\s+/g, '-')}`;
    const existing =
      (parsed.technicalId ? byId.get(parsed.technicalId) : undefined)
      ?? byKey.get(ruleKey.toLowerCase());

    const data = {
      ruleKey,
      ruleName: parsed.ruleName || ruleKey,
      ruleType: parsed.ruleType,
      family: parsed.family,
      articleId: parsed.articleId,
      priority: parsed.priority,
      active: parsed.active,
      connected: parsed.connected,
      message: parsed.message,
      condition: parsed.condition as Prisma.InputJsonValue,
      action: parsed.action as Prisma.InputJsonValue,
    };

    try {
      if (existing) {
        const same =
          existing.ruleName === data.ruleName
          && existing.ruleType === data.ruleType
          && existing.family === data.family
          && (existing.articleId ?? null) === (data.articleId ?? null)
          && existing.priority === data.priority
          && existing.active === data.active
          && existing.connected === data.connected
          && (existing.message ?? null) === (data.message ?? null)
          && JSON.stringify(existing.condition) === JSON.stringify(data.condition)
          && JSON.stringify(existing.action) === JSON.stringify(data.action);

        if (same) {
          report.unchanged += 1;
        } else {
          await prisma.businessRule.update({
            where: { id: existing.id },
            data: { ...data, updatedBy: opts?.userId, version: { increment: 1 } },
          });
          report.updated += 1;
        }
        if (parsed.excelRowId) excelIdMap[existing.id] = parsed.excelRowId;
      } else {
        const created = await prisma.businessRule.create({
          data: {
            ...data,
            createdBy: opts?.userId,
            source: 'excel-import',
          },
        });
        byId.set(created.id, created);
        byKey.set(created.ruleKey.toLowerCase(), created);
        if (parsed.excelRowId) excelIdMap[created.id] = parsed.excelRowId;
        report.created += 1;
      }
    } catch (e) {
      report.errors += 1;
      report.issues.push({
        line: lineNo,
        reason: e instanceof Error ? e.message : 'Erreur enregistrement',
      });
    }
  }

  await saveExcelIdMap(excelIdMap);

  await logAudit({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'IMPORT',
    entity: 'BusinessRule',
    entityLabel: opts?.fileName ?? 'import-excel',
    details: report,
  });

  return report;
}
