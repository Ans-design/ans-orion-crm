import { formatExcelRowId, parseExcelIdColumn } from '@/lib/backoffice/material-main-reference';

export const ANNEXES_EXCEL_COLUMNS = [
  'TYPE',
  'CODE',
  'NOM',
  'ADRESSE',
  'VILLE',
  'TÉLÉPHONE',
  'STATUT',
  'PAR DÉFAUT',
  'NOTES',
  'MATRICULE EMPLOYÉ',
  'SITE EMPLOYÉ',
  'ID',
] as const;

function pick(line: Record<string, unknown>, ...keys: string[]) {
  for (const k of keys) {
    const v = line[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function parseBool(v: unknown, def = false): boolean {
  const t = String(v ?? '').trim().toLowerCase();
  if (!t) return def;
  return t === 'oui' || t === '1' || t === 'true' || t === 'x';
}

export function annexeToExcelRow(
  annexe: {
    id: string;
    code: string;
    name: string;
    adresse?: string | null;
    ville?: string | null;
    tel?: string | null;
    statut?: string;
    isDefault?: boolean;
    notes?: string | null;
  },
  excelRowId?: string | null,
) {
  return {
    TYPE: 'SITE',
    CODE: annexe.code,
    NOM: annexe.name,
    ADRESSE: annexe.adresse ?? '',
    VILLE: annexe.ville ?? '',
    TÉLÉPHONE: annexe.tel ?? '',
    STATUT: annexe.statut ?? 'Actif',
    'PAR DÉFAUT': annexe.isDefault ? 'oui' : 'non',
    NOTES: annexe.notes ?? '',
    'MATRICULE EMPLOYÉ': '',
    'SITE EMPLOYÉ': '',
    ID: excelRowId ?? '',
  };
}

export function employeeAssignmentToExcelRow(
  employee: { matricule: string; firstName: string; lastName: string; site: string },
  excelRowId?: string | null,
) {
  return {
    TYPE: 'EMPLOYÉ',
    CODE: '',
    NOM: `${employee.firstName} ${employee.lastName}`.trim(),
    ADRESSE: '',
    VILLE: '',
    TÉLÉPHONE: '',
    STATUT: '',
    'PAR DÉFAUT': '',
    NOTES: '',
    'MATRICULE EMPLOYÉ': employee.matricule,
    'SITE EMPLOYÉ': employee.site,
    ID: excelRowId ?? '',
  };
}

export function parseAnnexeExcelRow(line: Record<string, unknown>, lineNo: number) {
  const idRaw = pick(line, 'ID', 'id');
  const { excelRowId, technicalId } = parseExcelIdColumn(idRaw);
  const type = pick(line, 'TYPE', 'Type').toUpperCase() || 'SITE';
  return {
    lineNo,
    excelRowId: excelRowId ?? null,
    technicalId: technicalId ?? null,
    type,
    code: pick(line, 'CODE', 'Code').toUpperCase(),
    name: pick(line, 'NOM', 'Nom'),
    adresse: pick(line, 'ADRESSE', 'Adresse') || null,
    ville: pick(line, 'VILLE', 'Ville') || null,
    tel: pick(line, 'TÉLÉPHONE', 'Telephone', 'TEL') || null,
    statut: pick(line, 'STATUT', 'Statut') || 'Actif',
    isDefault: parseBool(line['PAR DÉFAUT'] ?? line.ParDefaut),
    notes: pick(line, 'NOTES', 'Notes') || null,
    employeeMatricule: pick(line, 'MATRICULE EMPLOYÉ', 'Matricule'),
    employeeSite: pick(line, 'SITE EMPLOYÉ', 'Site').toUpperCase(),
  };
}

export function excelRowToAnnexeCanonical(line: Record<string, unknown>): Record<string, unknown> {
  const idRaw = pick(line, 'ID', 'id');
  const { excelRowId, technicalId } = parseExcelIdColumn(idRaw);
  return {
    TYPE: pick(line, 'TYPE', 'Type'),
    CODE: pick(line, 'CODE', 'Code'),
    NOM: pick(line, 'NOM', 'Nom'),
    excelRowId: excelRowId ?? '',
    ID: technicalId ?? idRaw,
  };
}

export function validateAnnexesExcelRows(rows: Record<string, unknown>[]) {
  if (!rows.length) return { ok: false, message: 'Fichier vide.' };
  const hasSite = rows.some((r) => {
    const type = String(r.TYPE ?? r.Type ?? 'SITE').toUpperCase();
    return type !== 'EMPLOYÉ' && type !== 'EMPLOYE' && String(r.CODE ?? r.Code ?? '').trim();
  });
  const hasEmployee = rows.some((r) => {
    const type = String(r.TYPE ?? r.Type ?? '').toUpperCase();
    return (type === 'EMPLOYÉ' || type === 'EMPLOYE') && String(r['MATRICULE EMPLOYÉ'] ?? r.Matricule ?? '').trim();
  });
  if (!hasSite && !hasEmployee) {
    return { ok: false, message: 'Colonnes CODE (site) ou MATRICULE EMPLOYÉ introuvables.' };
  }
  return { ok: true, materialColumn: 'CODE' };
}

export function assignAnnexeExcelIds(items: Array<{ id: string }>, existingMap: Record<string, string>) {
  const map = { ...existingMap };
  let maxNum = 0;
  for (const id of Object.values(map)) {
    const n = parseInt(id, 10);
    if (!Number.isNaN(n)) maxNum = Math.max(maxNum, n);
  }
  let assigned = 0;
  let preserved = 0;
  for (const item of items) {
    if (map[item.id]) {
      preserved += 1;
      continue;
    }
    maxNum += 1;
    map[item.id] = formatExcelRowId(maxNum);
    assigned += 1;
  }
  return { map, assigned, preserved };
}
