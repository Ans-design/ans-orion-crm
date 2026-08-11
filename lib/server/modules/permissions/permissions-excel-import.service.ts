import { logAudit } from '@/lib/audit';
import { parsePermissionExcelRow } from '@/lib/backoffice/permissions-excel-format';
import { upsertRoleModulePermission } from '@/lib/services/permission-admin-service';
import { MODULE_REGISTRY } from '@/lib/modules/module-registry';

export type PermissionsImportReport = {
  read: number;
  created: number;
  updated: number;
  unchanged: number;
  ignored: number;
  errors: number;
  issues: Array<{ line: number; field?: string; reason: string }>;
  syncModeUsed: 'upsert';
};

export async function importPermissionsFromExcel(
  rawLines: Record<string, unknown>[],
  opts?: { userId?: string; userName?: string; fileName?: string },
): Promise<PermissionsImportReport> {
  const report: PermissionsImportReport = {
    read: rawLines.length,
    created: 0,
    updated: 0,
    unchanged: 0,
    ignored: 0,
    errors: 0,
    issues: [],
    syncModeUsed: 'upsert',
  };

  for (let i = 0; i < rawLines.length; i++) {
    const parsed = parsePermissionExcelRow(rawLines[i]!, i);
    if (!parsed.role || !parsed.moduleId) {
      report.ignored += 1;
      report.issues.push({
        line: parsed.lineNo,
        reason: 'Rôle ou module manquant',
      });
      continue;
    }

    if (!MODULE_REGISTRY[parsed.moduleId]) {
      report.ignored += 1;
      report.issues.push({
        line: parsed.lineNo,
        reason: `Module inconnu : ${parsed.moduleId}`,
      });
      continue;
    }

    if (parsed.role === 'admin') {
      report.ignored += 1;
      report.issues.push({
        line: parsed.lineNo,
        reason: 'Le rôle admin est protégé',
      });
      continue;
    }

    if (!Object.keys(parsed.flags).length) {
      report.ignored += 1;
      continue;
    }

    try {
      await upsertRoleModulePermission(parsed.role, parsed.moduleId, parsed.flags);
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
    entity: 'RoleModulePermission',
    entityLabel: 'Permissions',
    details: { module: 'Permissions', fileName: opts?.fileName, ...report, issues: report.issues.slice(0, 30) },
  });

  return report;
}
