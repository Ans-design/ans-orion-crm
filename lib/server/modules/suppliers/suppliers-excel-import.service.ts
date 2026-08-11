import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { nextSequenceSafe } from '@/lib/services/SequenceService';
import { assertSupplierUnique } from '@/lib/server/modules/suppliers/supplier-dedup.service';
import {
  assignSupplierExcelIds,
  parseSupplierExcelRow,
  excelRowToSupplierCanonical,
} from '@/lib/backoffice/suppliers-excel-format';
import {
  countDuplicateExcelIdSkips,
  detectDuplicateExcelIds,
  duplicateExcelIdIssues,
  type DuplicateExcelIdGroup,
} from '@/lib/backoffice/material-excel-duplicate-ids';

const EXCEL_IDS_KEY = 'suppliers-excel-ids-v1';

export type SuppliersImportReport = {
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

export async function ensureSupplierExcelRowIds(): Promise<{
  assigned: number;
  preserved: number;
  ids: Record<string, string>;
}> {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: 'asc' },
    select: { id: true },
  });
  const map = await loadExcelIdMap();
  const result = assignSupplierExcelIds(suppliers, map);
  if (result.assigned > 0) await saveExcelIdMap(result.map);
  return { assigned: result.assigned, preserved: result.preserved, ids: result.map };
}

export async function importSuppliersFromExcel(
  rawLines: Record<string, unknown>[],
  opts?: { userId?: string; userName?: string; fileName?: string },
): Promise<SuppliersImportReport> {
  const duplicateIdGroups = detectDuplicateExcelIds(rawLines, excelRowToSupplierCanonical);
  const duplicateIssues = duplicateExcelIdIssues(duplicateIdGroups);

  const report: SuppliersImportReport = {
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
  const allSuppliers = await prisma.supplier.findMany();
  const byCode = new Map(allSuppliers.map((s) => [s.code.toLowerCase(), s]));
  const byId = new Map(allSuppliers.map((s) => [s.id, s]));
  const byName = new Map(allSuppliers.map((s) => [s.name.trim().toLowerCase(), s]));

  for (let i = 0; i < rawLines.length; i++) {
    if (skipIndexes.has(i)) {
      report.ignored += 1;
      continue;
    }

    const line = rawLines[i]!;
    const lineNo = i + 2;
    const parsed = parseSupplierExcelRow(line, lineNo);

    if (!parsed.name) {
      report.ignored += 1;
      report.issues.push({ line: lineNo, field: 'NOM', reason: 'Nom fournisseur manquant' });
      continue;
    }

    const existing =
      (parsed.technicalId ? byId.get(parsed.technicalId) : undefined)
      ?? (parsed.code ? byCode.get(parsed.code.toLowerCase()) : undefined)
      ?? byName.get(parsed.name.toLowerCase());

    const data = {
      name: parsed.name,
      tel: parsed.tel,
      email: parsed.email || null,
      adresse: parsed.adresse,
      ville: parsed.ville,
      contact: parsed.contact,
      categorie: parsed.categorie,
      notes: parsed.notes,
      statut: parsed.statut,
    };

    try {
      if (existing) {
        const same =
          existing.name === data.name
          && (existing.tel ?? null) === data.tel
          && (existing.email ?? null) === data.email
          && (existing.ville ?? null) === data.ville
          && (existing.adresse ?? null) === data.adresse
          && (existing.contact ?? null) === data.contact
          && (existing.notes ?? null) === data.notes
          && existing.categorie === data.categorie
          && existing.statut === data.statut;

        if (same) {
          report.unchanged += 1;
        } else {
          await assertSupplierUnique({
            email: data.email,
            tel: data.tel,
            excludeId: existing.id,
          });
          await prisma.supplier.update({ where: { id: existing.id }, data });
          report.updated += 1;
        }
        if (parsed.excelRowId) excelIdMap[existing.id] = parsed.excelRowId;
      } else {
        await assertSupplierUnique({ email: data.email, tel: data.tel });
        const code = parsed.code || (await nextSequenceSafe('FOU', () => prisma.supplier.count()));
        const created = await prisma.supplier.create({
          data: { code, ...data },
        });
        byId.set(created.id, created);
        byCode.set(created.code.toLowerCase(), created);
        byName.set(created.name.toLowerCase(), created);
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
    entity: 'Supplier',
    entityLabel: opts?.fileName ?? 'import-excel',
    details: report,
  });

  return report;
}
