import { formatExcelRowId, parseExcelIdColumn } from '@/lib/backoffice/material-main-reference';

export const SUPPLIERS_EXCEL_COLUMNS = [
  'CODE',
  'NOM',
  'CONTACT',
  'TÉLÉPHONE',
  'EMAIL',
  'VILLE',
  'ADRESSE',
  'CATÉGORIE',
  'STATUT',
  'NOTES',
  'ID',
] as const;

export type SupplierExcelRow = {
  code: string;
  name: string;
  contact: string | null;
  tel: string | null;
  email: string | null;
  ville: string | null;
  adresse: string | null;
  categorie: string;
  statut: 'Actif' | 'Inactif';
  notes: string | null;
  excelRowId: string | null;
  technicalId: string | null;
};

function pick(line: Record<string, unknown>, ...keys: string[]) {
  for (const k of keys) {
    const v = line[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function parseStatut(v: unknown, def: 'Actif' | 'Inactif' = 'Actif'): 'Actif' | 'Inactif' {
  const t = String(v ?? '').trim().toLowerCase();
  if (!t) return def;
  if (t === 'inactif' || t === '0' || t === 'non' || t === 'false') return 'Inactif';
  return 'Actif';
}

export function supplierToExcelRow(
  supplier: {
    id: string;
    code: string;
    name: string;
    contact?: string | null;
    tel?: string | null;
    email?: string | null;
    ville?: string | null;
    adresse?: string | null;
    categorie?: string;
    statut?: string;
    notes?: string | null;
  },
  excelRowId?: string | null,
) {
  return {
    CODE: supplier.code,
    NOM: supplier.name,
    CONTACT: supplier.contact ?? '',
    TÉLÉPHONE: supplier.tel ?? '',
    EMAIL: supplier.email ?? '',
    VILLE: supplier.ville ?? '',
    ADRESSE: supplier.adresse ?? '',
    CATÉGORIE: supplier.categorie ?? 'Papier',
    STATUT: supplier.statut ?? 'Actif',
    NOTES: supplier.notes ?? '',
    ID: excelRowId ?? '',
  };
}

export function parseSupplierExcelRow(line: Record<string, unknown>, lineNo: number): SupplierExcelRow {
  const idRaw = pick(line, 'ID', 'id');
  const { excelRowId, technicalId } = parseExcelIdColumn(idRaw);
  const name = pick(line, 'NOM', 'Nom', 'name');
  return {
    code: pick(line, 'CODE', 'Code', 'code'),
    name,
    contact: pick(line, 'CONTACT', 'Contact') || null,
    tel: pick(line, 'TÉLÉPHONE', 'Telephone', 'TEL', 'tel') || null,
    email: pick(line, 'EMAIL', 'Email', 'email') || null,
    ville: pick(line, 'VILLE', 'Ville') || null,
    adresse: pick(line, 'ADRESSE', 'Adresse') || null,
    categorie: pick(line, 'CATÉGORIE', 'Categorie', 'categorie') || 'Papier',
    statut: parseStatut(line.STATUT ?? line.Statut),
    notes: pick(line, 'NOTES', 'Notes') || null,
    excelRowId: excelRowId ?? null,
    technicalId: technicalId ?? null,
  };
}

export function excelRowToSupplierCanonical(line: Record<string, unknown>): Record<string, unknown> {
  const idRaw = pick(line, 'ID', 'id');
  const { excelRowId, technicalId } = parseExcelIdColumn(idRaw);
  return {
    NOM: pick(line, 'NOM', 'Nom', 'name'),
    CODE: pick(line, 'CODE', 'Code', 'code'),
    excelRowId: excelRowId ?? '',
    ID: technicalId ?? idRaw,
  };
}

export function validateSuppliersExcelRows(rows: Record<string, unknown>[]) {
  if (!rows.length) return { ok: false, message: 'Fichier vide.' };
  const hasName = rows.some((r) => String(r.NOM ?? r.Nom ?? r.name ?? '').trim());
  if (!hasName) return { ok: false, message: 'Colonne NOM introuvable.' };
  return { ok: true, materialColumn: 'NOM' };
}

export function emptySupplierExcelTemplate() {
  return [Object.fromEntries(SUPPLIERS_EXCEL_COLUMNS.map((c) => [c, '']))];
}

export function assignSupplierExcelIds(
  suppliers: Array<{ id: string }>,
  existingMap: Record<string, string>,
): { map: Record<string, string>; assigned: number; preserved: number } {
  const map = { ...existingMap };
  const used = new Set(Object.values(map));
  let maxNum = 0;
  for (const id of used) {
    const n = parseInt(id, 10);
    if (!Number.isNaN(n)) maxNum = Math.max(maxNum, n);
  }
  let assigned = 0;
  let preserved = 0;
  for (const s of suppliers) {
    if (map[s.id]) {
      preserved += 1;
      continue;
    }
    maxNum += 1;
    map[s.id] = formatExcelRowId(maxNum);
    assigned += 1;
  }
  return { map, assigned, preserved };
}
