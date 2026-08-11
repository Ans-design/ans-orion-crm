import type { PermissionFlags } from '@/lib/modules/types';
import { PERMISSION_MATRIX_COLUMNS } from '@/lib/constants/permission-flags';
import { formatExcelRowId } from '@/lib/backoffice/material-main-reference';

export const PERMISSIONS_EXCEL_COLUMNS = [
  'RÔLE',
  'MODULE',
  'VOIR',
  'CRÉER',
  'MODIFIER',
  'SUPPRIMER',
  'EXPORTER',
  'IMPORTER',
  'ID',
] as const;

const FLAG_MAP: Record<string, keyof PermissionFlags> = {
  VOIR: 'canView',
  CRÉER: 'canCreate',
  MODIFIER: 'canEdit',
  SUPPRIMER: 'canDelete',
  EXPORTER: 'canExport',
  IMPORTER: 'canConfigure',
};

function parseOuiNon(v: unknown): boolean {
  const t = String(v ?? '').trim().toLowerCase();
  return t === 'oui' || t === '1' || t === 'true' || t === 'x';
}

export function permissionRowToExcel(
  role: string,
  moduleId: string,
  moduleLabel: string,
  flags: PermissionFlags,
  excelRowId: string,
) {
  return {
    RÔLE: role,
    MODULE: `${moduleLabel} (${moduleId})`,
    VOIR: flags.canView ? 'oui' : 'non',
    CRÉER: flags.canCreate ? 'oui' : 'non',
    MODIFIER: flags.canEdit ? 'oui' : 'non',
    SUPPRIMER: flags.canDelete ? 'oui' : 'non',
    EXPORTER: flags.canExport ? 'oui' : 'non',
    IMPORTER: flags.canConfigure ? 'oui' : 'non',
    ID: excelRowId,
  };
}

export function parsePermissionExcelRow(line: Record<string, unknown>, lineNo: number) {
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = line[k];
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        return String(v).trim();
      }
    }
    return '';
  };

  const moduleRaw = pick('MODULE', 'Module', 'module');
  const moduleIdMatch = moduleRaw.match(/\(([^)]+)\)\s*$/);
  const moduleId = moduleIdMatch?.[1] ?? moduleRaw;

  const flags: Partial<PermissionFlags> = {};
  for (const [col, key] of Object.entries(FLAG_MAP)) {
    const val = line[col] ?? line[col.toLowerCase()];
    if (val !== undefined && String(val).trim() !== '') {
      flags[key] = parseOuiNon(val);
    }
  }

  return {
    lineNo,
    role: pick('RÔLE', 'Role', 'role'),
    moduleId,
    moduleLabel: moduleRaw.replace(/\s*\([^)]+\)\s*$/, '').trim(),
    flags,
    excelRowId: pick('ID', 'id'),
  };
}

export function validatePermissionsExcelRows(rows: Record<string, unknown>[]) {
  if (!rows.length) return { ok: false, message: 'Fichier vide.' };
  const hasRole = rows.some((r) => String(r.RÔLE ?? r.Role ?? '').trim());
  const hasModule = rows.some((r) => String(r.MODULE ?? r.Module ?? '').trim());
  if (!hasRole || !hasModule) {
    return { ok: false, message: 'Colonnes RÔLE et MODULE requises.' };
  }
  return { ok: true, materialColumn: 'RÔLE' };
}

export function usersToExcelRows(
  users: Array<{ id: string; name: string | null; email: string; role: string }>,
) {
  return users.map((u, i) => ({
    NOM: u.name ?? '',
    EMAIL: u.email,
    RÔLE: u.role,
    'MODULES AUTORISÉS': '—',
    STATUT: 'actif',
    TÉLÉPHONE: '',
    ID: formatExcelRowId(i + 1),
  }));
}

export { PERMISSION_MATRIX_COLUMNS };
