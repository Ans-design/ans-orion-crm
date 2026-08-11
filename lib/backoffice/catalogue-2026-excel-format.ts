/**
 * Catalogue 2026 — référentiel tarifaire exact (PRIX 2026 consolidé).
 * Feuilles : Matières, Prix imprimés exacts, Services exacts, Sans prix exact, Méthode.
 */

import * as XLSX from 'xlsx';
import path from 'node:path';
import fs from 'node:fs';
import { formatExcelRowId, parseExcelIdColumn } from '@/lib/backoffice/material-main-reference';
import { parseCharacteristicTypeLabel } from '@/lib/backoffice/material-import-key';

export const CATALOGUE_2026_SHEETS = {
  materials: 'Matières',
  exactPrint: 'Prix imprimés exacts',
  exactServices: 'Services exacts',
  withoutPrice: 'Sans prix exact',
  method: 'Méthode',
} as const;

export const CATALOGUE_2026_REFERENCE_PATH = path.join(
  process.cwd(),
  'docs/references/catalogue-2026-prix-exacts.xlsx',
);

export type Catalogue2026MaterialRow = {
  excelRowId: string;
  name: string;
  charType: string;
  charValue: string;
  family: string;
  charType2: string;
  charValue2: string;
  unit: string;
  blankPrice: number | null;
  marginGain: number | null;
  printPrice: number | null;
  stock: number | null;
};

export type Catalogue2026ServiceRow = {
  ref: string;
  category: string;
  article: string;
  characteristic: string;
  format: string;
  impression: string;
  qtyRef: string;
  priceUnit: string;
  unitPrice: number;
  sourceSheet: string;
  sourceRef: string;
  note: string;
};

export type Catalogue2026WithoutPriceRow = {
  excelRowId: string;
  name: string;
  charType: string;
  charValue: string;
  family: string;
  reason: string;
};

export type Catalogue2026MethodRule = {
  number: number;
  rule: string;
  application: string;
  control: string;
};

export type Catalogue2026Workbook = {
  materials: Catalogue2026MaterialRow[];
  exactPrintPrices: Record<string, unknown>[];
  services: Catalogue2026ServiceRow[];
  withoutPrice: Catalogue2026WithoutPriceRow[];
  withoutPriceIds: Set<string>;
  methodRules: Catalogue2026MethodRule[];
};

let cachedWorkbook: Catalogue2026Workbook | null = null;
let cachedSansPrixIds: Set<string> | null = null;

function pick(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = raw[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function num(val: unknown): number | null {
  if (val == null || val === '') return null;
  const n = Number(String(val).replace(/\s/g, '').replace(/[^\d.,-]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function sheetMatrixToRows(sheet: XLSX.WorkSheet, headerRowIndex = 0): Record<string, unknown>[] {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  if (!matrix.length) return [];
  const headers = ((matrix[headerRowIndex] ?? []) as unknown[]).map((h, idx) =>
    String(h ?? '').trim() || `__col_${idx}`,
  );
  const out: Record<string, unknown>[] = [];
  for (let r = headerRowIndex + 1; r < matrix.length; r++) {
    const cells = (matrix[r] ?? []) as unknown[];
    if (!cells.some((c) => String(c ?? '').trim() !== '')) continue;
    const row: Record<string, unknown> = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c]!;
      if (key.startsWith('__col_')) continue;
      row[key] = cells[c] ?? '';
    }
    out.push(row);
  }
  return out;
}

function findHeaderRow(matrix: unknown[][], pattern: RegExp): number {
  for (let i = 0; i < Math.min(matrix.length, 20); i++) {
    const joined = ((matrix[i] ?? []) as unknown[]).map((c) => String(c)).join('|');
    if (pattern.test(joined)) return i;
  }
  return 0;
}

/** Cherche la ligne d'en-tête via la première colonne (évite les faux positifs sur titres de feuille). */
function findHeaderRowByFirstColumn(matrix: unknown[][], firstCol: RegExp): number {
  for (let i = 0; i < Math.min(matrix.length, 25); i++) {
    const first = String(((matrix[i] ?? []) as unknown[])[0] ?? '').trim();
    if (firstCol.test(first)) return i;
  }
  return 0;
}

export function parseCatalogue2026Buffer(buf: Buffer | ArrayBuffer): Catalogue2026Workbook {
  const wb = XLSX.read(buf, { type: buf instanceof ArrayBuffer ? 'array' : 'buffer' });

  const matSheet = wb.Sheets[CATALOGUE_2026_SHEETS.materials];
  const matRaw = matSheet ? sheetMatrixToRows(matSheet, 0) : [];
  const materials: Catalogue2026MaterialRow[] = matRaw
    .map((raw) => {
      const idRaw = pick(raw, 'ID', 'id');
      const parsed = parseExcelIdColumn(idRaw);
      const excelRowId = parsed.excelRowId
        ? formatExcelRowId(Number(parsed.excelRowId))
        : idRaw
          ? formatExcelRowId(Number(idRaw.replace(/\D/g, '')) || 0)
          : '';
      if (!excelRowId || excelRowId === '000') return null;
      return {
        excelRowId,
        name: pick(raw, 'Matière', 'MATIÈRE', 'Matiere'),
        charType: pick(raw, 'Type', 'TYPE'),
        charValue: pick(raw, 'Valeur', 'VALEUR'),
        family: pick(raw, 'Famille', 'FAMILLE'),
        charType2: pick(raw, 'Type secondaire', 'TYPE SECONDAIRE'),
        charValue2: pick(raw, 'Valeur secondaire', 'VALEUR SECONDAIRE'),
        unit: pick(raw, 'Unité', 'UNITE', 'Unité prix'),
        blankPrice: num(raw['Prix matière']),
        marginGain: num(raw['Marge de gain']),
        printPrice: num(raw['Prix imprimé recto (Ar)'] ?? raw['Prix imprimé'] ?? raw['Prix imprime']),
        stock: num(raw.Stock ?? raw.STOCK),
      } satisfies Catalogue2026MaterialRow;
    })
    .filter((r): r is Catalogue2026MaterialRow => r != null && Boolean(r.name));

  const printSheet = wb.Sheets[CATALOGUE_2026_SHEETS.exactPrint];
  const printMatrix = printSheet
    ? XLSX.utils.sheet_to_json<unknown[]>(printSheet, { header: 1, defval: '' })
    : [];
  const printHeaderIdx = findHeaderRowByFirstColumn(printMatrix, /^Réf\.?$/i);
  const exactPrintPrices = printSheet ? sheetMatrixToRows(printSheet, printHeaderIdx) : [];

  const svcSheet = wb.Sheets[CATALOGUE_2026_SHEETS.exactServices];
  const svcMatrix = svcSheet
    ? XLSX.utils.sheet_to_json<unknown[]>(svcSheet, { header: 1, defval: '' })
    : [];
  const svcHeaderIdx = findHeaderRowByFirstColumn(svcMatrix, /^Réf\.?$/i);
  const svcRaw = svcSheet ? sheetMatrixToRows(svcSheet, svcHeaderIdx) : [];
  const services: Catalogue2026ServiceRow[] = svcRaw
    .map((raw) => {
      const ref = pick(raw, 'Réf.', 'Ref', 'REF', 'ID');
      if (!ref) return null;
      const unitPrice = num(raw['Prix imprimé max (Ar)'] ?? raw.PRIX ?? raw.Prix);
      if (unitPrice == null || unitPrice <= 0) return null;
      return {
        ref,
        category: pick(raw, 'Catégorie', 'Categorie'),
        article: pick(raw, 'Article'),
        characteristic: pick(raw, 'Caractéristique', 'Caracteristique'),
        format: pick(raw, 'Format / dimension', 'Format', 'FORMAT'),
        impression: pick(raw, 'Impression'),
        qtyRef: pick(raw, 'Quantité de référence', 'Quantite de reference'),
        priceUnit: pick(raw, 'Unité tarifée', 'Unite tarifee', 'UNITÉ'),
        unitPrice,
        sourceSheet: pick(raw, 'Feuille source'),
        sourceRef: pick(raw, 'Référence source', 'Reference source'),
        note: pick(raw, 'Note'),
      } satisfies Catalogue2026ServiceRow;
    })
    .filter((r): r is Catalogue2026ServiceRow => r != null);

  const missSheet = wb.Sheets[CATALOGUE_2026_SHEETS.withoutPrice];
  const missMatrix = missSheet
    ? XLSX.utils.sheet_to_json<unknown[]>(missSheet, { header: 1, defval: '' })
    : [];
  const missHeaderIdx = findHeaderRowByFirstColumn(missMatrix, /^ID$/i);
  const missRaw = missSheet ? sheetMatrixToRows(missSheet, missHeaderIdx) : [];
  const withoutPrice: Catalogue2026WithoutPriceRow[] = missRaw
    .map((raw) => {
      const idRaw = pick(raw, 'ID', 'id');
      const parsed = parseExcelIdColumn(idRaw);
      const excelRowId = parsed.excelRowId
        ? formatExcelRowId(Number(parsed.excelRowId))
        : idRaw
          ? formatExcelRowId(Number(idRaw.replace(/\D/g, '')) || 0)
          : '';
      if (!excelRowId || excelRowId === '000') return null;
      return {
        excelRowId,
        name: pick(raw, 'Matière', 'MATIÈRE'),
        charType: pick(raw, 'Type'),
        charValue: pick(raw, 'Valeur'),
        family: pick(raw, 'Famille'),
        reason: pick(raw, 'Motif', 'MOTIF'),
      } satisfies Catalogue2026WithoutPriceRow;
    })
    .filter((r): r is Catalogue2026WithoutPriceRow => r != null);

  const withoutPriceIds = new Set(withoutPrice.map((r) => r.excelRowId));

  const methodSheet = wb.Sheets[CATALOGUE_2026_SHEETS.method];
  const methodMatrix = methodSheet
    ? XLSX.utils.sheet_to_json<unknown[]>(methodSheet, { header: 1, defval: '' })
    : [];
  const methodHeaderIdx = findHeaderRowByFirstColumn(methodMatrix, /^N°|N$/i);
  const methodRaw = methodSheet ? sheetMatrixToRows(methodSheet, methodHeaderIdx) : [];
  const methodRules: Catalogue2026MethodRule[] = methodRaw
    .map((raw) => {
      const n = Number(pick(raw, 'N°', 'N', 'No', 'Numero'));
      if (!Number.isFinite(n) || n <= 0) return null;
      return {
        number: n,
        rule: pick(raw, 'Règle', 'Regle', 'RÈGLE'),
        application: pick(raw, 'Application'),
        control: pick(raw, 'Contrôle', 'Controle'),
      } satisfies Catalogue2026MethodRule;
    })
    .filter((r): r is Catalogue2026MethodRule => r != null);

  return {
    materials,
    exactPrintPrices,
    services,
    withoutPrice,
    withoutPriceIds,
    methodRules,
  };
}

export function loadCatalogue2026FromPath(filePath = CATALOGUE_2026_REFERENCE_PATH): Catalogue2026Workbook {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Référentiel Catalogue 2026 introuvable : ${filePath}`);
  }
  const buf = fs.readFileSync(filePath);
  return parseCatalogue2026Buffer(buf);
}

export function getCatalogue2026Workbook(forceReload = false): Catalogue2026Workbook {
  if (!cachedWorkbook || forceReload) {
    cachedWorkbook = loadCatalogue2026FromPath();
    cachedSansPrixIds = cachedWorkbook.withoutPriceIds;
  }
  return cachedWorkbook;
}

export function getCatalogue2026SansPrixIds(): Set<string> {
  if (!cachedSansPrixIds) {
    cachedSansPrixIds = getCatalogue2026Workbook().withoutPriceIds;
  }
  return cachedSansPrixIds;
}

export function isCatalogue2026SansTarif(excelRowId: string | null | undefined): boolean {
  if (!excelRowId) return false;
  const parsed = parseExcelIdColumn(excelRowId);
  const id = parsed.excelRowId
    ? formatExcelRowId(Number(parsed.excelRowId))
    : formatExcelRowId(Number(String(excelRowId).replace(/\D/g, '')) || 0);
  return getCatalogue2026SansPrixIds().has(id);
}

/** Convertit une ligne Matières Catalogue 2026 → format import matières existant. */
export function catalogue2026MaterialToImportRow(row: Catalogue2026MaterialRow): Record<string, unknown> {
  const charType = parseCharacteristicTypeLabel(row.charType || 'autre');
  const secondary =
    row.charType2 && row.charValue2 ? `${row.charType2}: ${row.charValue2}` : row.charType2 || row.charValue2 || '';

  return {
    ID: row.excelRowId,
    Matière: row.name,
    'Type caractéristique': row.charType || charType,
    Valeur: row.charValue,
    Famille: row.family,
    'Référence principale': '',
    'Prix base': row.printPrice ?? '',
    'Prix matière': row.blankPrice ?? '',
    'Marge de gain': row.marginGain ?? '',
    'Unité prix': row.unit,
    'Détails autres': secondary,
  };
}

/** Convertit un service Catalogue 2026 → format import finitions existant. */
export function catalogue2026ServiceToFinishingRow(row: Catalogue2026ServiceRow): Record<string, unknown> {
  const nameParts = [row.article, row.characteristic, row.format].filter(Boolean);
  const name = nameParts.join(' — ');
  const category = row.category.toLowerCase().includes('reliure')
    ? 'reliure'
    : row.category.toLowerCase().includes('finition')
      ? 'finition'
      : row.category.toLowerCase().includes('pose')
        ? 'pose'
        : row.category.toLowerCase() || 'finition';

  return {
    ID: row.ref,
    FINITION: name || row.article,
    FAMILLE: row.category,
    TYPE: category,
    RÉFÉRENCE: row.characteristic || row.format,
    FORMAT: row.format,
    UNITÉ: row.priceUnit || 'pièce',
    PRIX: row.unitPrice,
    'VISIBLE POS': 'oui',
    ACTIF: 'oui',
    DÉTAIL: [row.qtyRef, row.sourceSheet, row.sourceRef, row.note].filter(Boolean).join(' — '),
  };
}

/** Lignes matières avec prix imprimé exact (pour apply upsert). */
export function catalogue2026MaterialsWithPrintPrice(wb?: Catalogue2026Workbook): Catalogue2026MaterialRow[] {
  const book = wb ?? getCatalogue2026Workbook();
  return book.materials.filter((m) => m.printPrice != null && m.printPrice > 0);
}
