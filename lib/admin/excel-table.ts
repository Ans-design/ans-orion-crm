import * as XLSX from 'xlsx';
import {
  MATERIAL_EXCEL_COLUMNS,
  MATERIAL_TABLE_EXPORT_COLUMNS,
  validateMaterialExcelRows,
  type MaterialExcelRow,
} from '@/lib/backoffice/material-excel-format';

/** Déclenche le téléchargement d'un workbook via un blob URL (compatible navigateur). */
function downloadWorkbook(wb: XLSX.WorkBook, fileName: string) {
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

function orderRowsByColumns(
  rows: Record<string, unknown>[],
  columns: readonly string[],
): Record<string, unknown>[] {
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const col of columns) {
      out[col] = row[col] ?? '';
    }
    return out;
  });
}

export function exportGenericRowsToXlsx(
  rows: Record<string, unknown>[],
  columns: readonly string[],
  fileStem: string,
  sheetName = 'Export',
) {
  const ordered = orderRowsByColumns(rows, columns);
  const ws = XLSX.utils.json_to_sheet(ordered, { header: [...columns] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const date = new Date().toISOString().slice(0, 10);
  downloadWorkbook(wb, `ans-orion-${fileStem}-${date}.xlsx`);
}

/** Export multi-feuilles (ex. Catalogue aperçu + Fiches parents). */
export function exportMultiSheetXlsx(
  sheets: Array<{
    name: string;
    columns: readonly string[];
    rows: Record<string, unknown>[];
  }>,
  fileStem: string,
) {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const ordered = orderRowsByColumns(sheet.rows, sheet.columns);
    const ws = XLSX.utils.json_to_sheet(ordered, { header: [...sheet.columns] });
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }
  const date = new Date().toISOString().slice(0, 10);
  downloadWorkbook(wb, `ans-orion-${fileStem}-${date}.xlsx`);
}

export function exportMaterialTableRowsToXlsx(
  rows: Record<string, unknown>[],
  fileStem = 'matieres-tarifs',
) {
  exportGenericRowsToXlsx(rows, MATERIAL_TABLE_EXPORT_COLUMNS, fileStem, 'Matières');
}

export function exportRowsToXlsx(
  rows: Record<string, unknown>[],
  fileStem: string,
  sheetName = 'Export',
) {
  /** Déduit les colonnes depuis les clés des lignes — ne force plus les colonnes matières. */
  const columns =
    rows.length > 0
      ? Array.from(
          rows.reduce((set, row) => {
            Object.keys(row).forEach((k) => set.add(k));
            return set;
          }, new Set<string>()),
        )
      : [...MATERIAL_EXCEL_COLUMNS];
  exportGenericRowsToXlsx(rows, columns, fileStem, sheetName);
}

/** @deprecated Préférer exportGenericRowsToXlsx(MATERIAL_EXCEL_COLUMNS) — legacy capture 1. */
export function exportMaterialExcelRows(rows: MaterialExcelRow[], fileStem: string) {
  exportGenericRowsToXlsx(
    rows as unknown as Record<string, unknown>[],
    MATERIAL_EXCEL_COLUMNS,
    fileStem,
    'Matières',
  );
}

export { validateMaterialExcelRows };

function sheetMatrixToRows(sheet: XLSX.WorkSheet): Record<string, unknown>[] {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  if (!matrix.length) return [];

  let headerIndex = 0;
  for (let i = 0; i < Math.min(matrix.length, 15); i++) {
    const cells = (matrix[i] ?? []) as unknown[];
    const joined = cells.map((c) => String(c).toLowerCase()).join('|');
    if (
      /mati[eè]re|material|article|finition|prestation|vente|technique|suppl[eé]ment|option|mod[eè]le|id|famille|catalogue/i.test(
        joined,
      ) &&
      (/prix|valeur|type|id|actif|visible|stock|marge|unit/i.test(joined) || /autoris/i.test(joined))
    ) {
      headerIndex = i;
      break;
    }
  }

  const headers = ((matrix[headerIndex] ?? []) as unknown[]).map((h, idx) =>
    String(h ?? '').trim() || `__col_${idx}`,
  );
  const out: Record<string, unknown>[] = [];
  for (let r = headerIndex + 1; r < matrix.length; r++) {
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

export async function parseXlsxFile(file: File): Promise<Record<string, unknown>[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  /** Préférer la feuille métier (pas un onglet vide / métadonnées). */
  const preferred =
    wb.SheetNames.find((n) =>
      /mati[eè]re|material|article|option|chip|catalogue|stock|prix|export/i.test(n),
    )
    ?? wb.SheetNames[0];
  const sheet = preferred ? wb.Sheets[preferred] : undefined;
  if (!sheet) return [];
  return sheetMatrixToRows(sheet);
}

/** Parse toutes les feuilles d’un classeur → map nomFeuille → lignes. */
export async function parseMultiSheetXlsx(
  file: File,
): Promise<Record<string, Record<string, unknown>[]>> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const out: Record<string, Record<string, unknown>[]> = {};
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    out[name] = sheetMatrixToRows(sheet);
  }
  return out;
}
