import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import {
  assignCarrierExcelIds,
  parseCarrierExcelRow,
  excelRowToCarrierCanonical,
} from '@/lib/backoffice/carriers-excel-format';
import {
  countDuplicateExcelIdSkips,
  detectDuplicateExcelIds,
  duplicateExcelIdIssues,
  type DuplicateExcelIdGroup,
} from '@/lib/backoffice/material-excel-duplicate-ids';
import {
  carriersConfigSchema,
  DEFAULT_CARRIERS,
  type MadagascarCarrier,
} from '@/lib/logistics/carriers-config';
import { getCarriersConfigAdmin, saveCarriersConfig } from '@/lib/services/carriers-config-service';

const EXCEL_IDS_KEY = 'carriers-excel-ids-v1';

export type CarriersImportReport = {
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

export async function ensureCarrierExcelRowIds(): Promise<{
  assigned: number;
  preserved: number;
  ids: Record<string, string>;
}> {
  const carriers = await getCarriersConfigAdmin();
  const map = await loadExcelIdMap();
  const result = assignCarrierExcelIds(carriers, map);
  if (result.assigned > 0) await saveExcelIdMap(result.map);
  return { assigned: result.assigned, preserved: result.preserved, ids: result.map };
}

function carrierEquals(
  a: MadagascarCarrier & { active?: boolean },
  b: ReturnType<typeof parseCarrierExcelRow>,
) {
  return (
    a.label === b.label
    && a.type === b.type
    && a.zones.join('|') === b.zones.join('|')
    && (a.contactHint ?? '') === (b.contactHint ?? '')
    && (a.active !== false) === b.active
  );
}

export async function importCarriersFromExcel(
  rawLines: Record<string, unknown>[],
  opts?: { userId?: string; userName?: string; fileName?: string },
): Promise<CarriersImportReport> {
  const duplicateIdGroups = detectDuplicateExcelIds(rawLines, excelRowToCarrierCanonical);
  const duplicateIssues = duplicateExcelIdIssues(duplicateIdGroups);

  const report: CarriersImportReport = {
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
  let carriers = await getCarriersConfigAdmin();
  if (!carriers.length) carriers = DEFAULT_CARRIERS.map((c) => ({ ...c, active: true }));
  const byId = new Map(carriers.map((c) => [c.id, c]));

  for (let i = 0; i < rawLines.length; i++) {
    if (skipIndexes.has(i)) {
      report.ignored += 1;
      continue;
    }

    const line = rawLines[i]!;
    const lineNo = i + 2;
    const parsed = parseCarrierExcelRow(line, lineNo);

    if (!parsed.label && !parsed.id) {
      report.ignored += 1;
      report.issues.push({ line: lineNo, field: 'LIBELLÉ', reason: 'Libellé ou référence requis' });
      continue;
    }

    const carrierId = parsed.id || `carrier-${parsed.label.toLowerCase().replace(/\s+/g, '-').slice(0, 40)}`;
    const existing = byId.get(carrierId);

    const nextRow = {
      id: carrierId,
      label: parsed.label || existing?.label || carrierId,
      type: parsed.type,
      zones: parsed.zones.length ? parsed.zones : existing?.zones ?? ['Antananarivo'],
      contactHint: parsed.contactHint,
      active: parsed.active,
    };

    if (existing) {
      if (carrierEquals(existing, parsed)) report.unchanged += 1;
      else {
        byId.set(carrierId, nextRow);
        report.updated += 1;
      }
    } else {
      byId.set(carrierId, nextRow);
      report.created += 1;
    }

    if (parsed.excelRowId) excelIdMap[carrierId] = parsed.excelRowId;
  }

  const merged = Array.from(byId.values());
  try {
    carriersConfigSchema.parse(merged);
    await saveCarriersConfig(merged, opts?.userId);
    await saveExcelIdMap(excelIdMap);
  } catch (e) {
    report.errors += 1;
    report.issues.push({
      line: 0,
      reason: e instanceof Error ? e.message : 'Validation transporteurs échouée',
    });
    return report;
  }

  await logAudit({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'IMPORT',
    entity: 'CarriersConfig',
    entityLabel: opts?.fileName ?? 'import-excel',
    details: report,
  });

  return report;
}
