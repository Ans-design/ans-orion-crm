import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import {
  assignAnnexeExcelIds,
  parseAnnexeExcelRow,
  excelRowToAnnexeCanonical,
} from '@/lib/backoffice/annexes-excel-format';
import {
  countDuplicateExcelIdSkips,
  detectDuplicateExcelIds,
  duplicateExcelIdIssues,
  type DuplicateExcelIdGroup,
} from '@/lib/backoffice/material-excel-duplicate-ids';
import { assignEmployeeToSite, createSiteAnnexe, updateSiteAnnexe } from '@/lib/services/annex-service';

const EXCEL_IDS_KEY = 'annexes-excel-ids-v1';

export type AnnexesImportReport = {
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

export async function ensureAnnexeExcelRowIds(): Promise<{
  assigned: number;
  preserved: number;
  ids: Record<string, string>;
}> {
  const annexes = await prisma.siteAnnexe.findMany({ orderBy: { code: 'asc' }, select: { id: true } });
  const map = await loadExcelIdMap();
  const result = assignAnnexeExcelIds(annexes, map);
  if (result.assigned > 0) await saveExcelIdMap(result.map);
  return { assigned: result.assigned, preserved: result.preserved, ids: result.map };
}

export async function importAnnexesFromExcel(
  rawLines: Record<string, unknown>[],
  opts?: { userId?: string; userName?: string; fileName?: string },
): Promise<AnnexesImportReport> {
  const duplicateIdGroups = detectDuplicateExcelIds(rawLines, excelRowToAnnexeCanonical);
  const duplicateIssues = duplicateExcelIdIssues(duplicateIdGroups);

  const report: AnnexesImportReport = {
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
  const allAnnexes = await prisma.siteAnnexe.findMany();
  const byCode = new Map(allAnnexes.map((a) => [a.code.toUpperCase(), a]));
  const byId = new Map(allAnnexes.map((a) => [a.id, a]));

  for (let i = 0; i < rawLines.length; i++) {
    if (skipIndexes.has(i)) {
      report.ignored += 1;
      continue;
    }

    const line = rawLines[i]!;
    const lineNo = i + 2;
    const parsed = parseAnnexeExcelRow(line, lineNo);
    const isEmployee =
      parsed.type === 'EMPLOYÉ' || parsed.type === 'EMPLOYE' || Boolean(parsed.employeeMatricule);

    try {
      if (isEmployee) {
        if (!parsed.employeeMatricule || !parsed.employeeSite) {
          report.ignored += 1;
          report.issues.push({
            line: lineNo,
            field: 'MATRICULE EMPLOYÉ',
            reason: 'Matricule et site employé requis',
          });
          continue;
        }
        const emp = await prisma.employee.findFirst({
          where: { matricule: parsed.employeeMatricule },
        });
        if (!emp) {
          report.errors += 1;
          report.issues.push({
            line: lineNo,
            reason: `Employé ${parsed.employeeMatricule} introuvable`,
          });
          continue;
        }
        if (emp.site === parsed.employeeSite) {
          report.unchanged += 1;
        } else {
          await assignEmployeeToSite(emp.id, parsed.employeeSite);
          report.updated += 1;
        }
        continue;
      }

      if (!parsed.code || !parsed.name) {
        report.ignored += 1;
        report.issues.push({ line: lineNo, field: 'CODE', reason: 'Code et nom site requis' });
        continue;
      }

      const existing =
        (parsed.technicalId ? byId.get(parsed.technicalId) : undefined) ?? byCode.get(parsed.code);

      if (existing) {
        const same =
          existing.name === parsed.name
          && (existing.adresse ?? null) === parsed.adresse
          && (existing.ville ?? null) === parsed.ville
          && (existing.tel ?? null) === parsed.tel
          && existing.statut === parsed.statut
          && (existing.notes ?? null) === parsed.notes;

        if (same) report.unchanged += 1;
        else {
          await updateSiteAnnexe(existing.id, {
            name: parsed.name,
            adresse: parsed.adresse,
            ville: parsed.ville,
            tel: parsed.tel,
            statut: parsed.statut,
            notes: parsed.notes,
          });
          report.updated += 1;
        }
        if (parsed.excelRowId) excelIdMap[existing.id] = parsed.excelRowId;
      } else {
        const created = await createSiteAnnexe({
          code: parsed.code,
          name: parsed.name,
          adresse: parsed.adresse,
          ville: parsed.ville,
          tel: parsed.tel,
          notes: parsed.notes,
        });
        byCode.set(created.code.toUpperCase(), created);
        byId.set(created.id, created);
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
    entity: 'SiteAnnexe',
    entityLabel: opts?.fileName ?? 'import-excel',
    details: report,
  });

  return report;
}
