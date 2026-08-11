import { formatExcelRowId, parseExcelIdColumn } from '@/lib/backoffice/material-main-reference';
import type { MadagascarCarrier } from '@/lib/logistics/carriers-config';

export const CARRIERS_EXCEL_COLUMNS = [
  'RÉFÉRENCE',
  'LIBELLÉ',
  'TYPE',
  'ZONES',
  'CONTACT',
  'ACTIF',
  'ID',
] as const;

type CarrierRow = MadagascarCarrier & { active?: boolean };

function pick(line: Record<string, unknown>, ...keys: string[]) {
  for (const k of keys) {
    const v = line[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function parseBool(v: unknown, def = true): boolean {
  const t = String(v ?? '').trim().toLowerCase();
  if (!t) return def;
  return t === 'oui' || t === '1' || t === 'true' || t === 'x';
}

function parseType(line: Record<string, unknown>): CarrierRow['type'] {
  const t = pick(line, 'TYPE', 'Type').toLowerCase();
  if (t === 'cooperative' || t === 'coopérative') return 'cooperative';
  if (t === 'coursier') return 'coursier';
  if (t === 'interne') return 'interne';
  return 'transporteur';
}

export function carrierToExcelRow(
  carrier: CarrierRow,
  excelRowId?: string | null,
) {
  return {
    RÉFÉRENCE: carrier.id,
    LIBELLÉ: carrier.label,
    TYPE: carrier.type,
    ZONES: carrier.zones.join(', '),
    CONTACT: carrier.contactHint ?? '',
    ACTIF: carrier.active !== false ? 'oui' : 'non',
    ID: excelRowId ?? '',
  };
}

export function parseCarrierExcelRow(line: Record<string, unknown>, lineNo: number) {
  const idRaw = pick(line, 'ID', 'id');
  const { excelRowId, technicalId } = parseExcelIdColumn(idRaw);
  const reference = pick(line, 'RÉFÉRENCE', 'Référence', 'reference', 'ID TECH');
  const zonesRaw = pick(line, 'ZONES', 'Zones');
  return {
    lineNo,
    excelRowId: excelRowId ?? null,
    technicalId: technicalId ?? null,
    id: reference || technicalId || '',
    label: pick(line, 'LIBELLÉ', 'Libelle', 'Libellé', 'label'),
    type: parseType(line),
    zones: zonesRaw
      ? zonesRaw.split(/[,;]/).map((z) => z.trim()).filter(Boolean)
      : ['Antananarivo'],
    contactHint: pick(line, 'CONTACT', 'Contact') || undefined,
    active: parseBool(line.ACTIF ?? line.Actif, true),
  };
}

export function excelRowToCarrierCanonical(line: Record<string, unknown>): Record<string, unknown> {
  const idRaw = pick(line, 'ID', 'id');
  const { excelRowId, technicalId } = parseExcelIdColumn(idRaw);
  return {
    RÉFÉRENCE: pick(line, 'RÉFÉRENCE', 'Référence', 'reference'),
    LIBELLÉ: pick(line, 'LIBELLÉ', 'Libelle', 'Libellé'),
    excelRowId: excelRowId ?? '',
    ID: technicalId ?? pick(line, 'RÉFÉRENCE', 'Référence'),
  };
}

export function validateCarriersExcelRows(rows: Record<string, unknown>[]) {
  if (!rows.length) return { ok: false, message: 'Fichier vide.' };
  const hasRef = rows.some((r) => String(r.RÉFÉRENCE ?? r.Référence ?? r.LIBELLÉ ?? r.Libellé ?? '').trim());
  if (!hasRef) return { ok: false, message: 'Colonnes RÉFÉRENCE ou LIBELLÉ introuvables.' };
  return { ok: true, materialColumn: 'RÉFÉRENCE' };
}

export function assignCarrierExcelIds(items: Array<{ id: string }>, existingMap: Record<string, string>) {
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
