/**
 * Lookup prix matières — snapshot Catalogue 2026 Excel (SoT audit).
 * Client-safe (JSON) ; régénérer via `npx tsx scripts/export-catalogue-2026-price-lookups.ts`.
 */

import materialPrices from '@/data/references/catalogue-2026-material-prices.json';
import { normalizeCataloguePriceKey } from '@/lib/backoffice/catalogue-2026-price-key';
import { formatExcelRowId, parseExcelIdColumn } from '@/lib/backoffice/material-main-reference';

export type Catalogue2026MaterialTariff = {
  printPrice: number | null;
  blankPrice: number | null;
  excelRowId?: string;
  name?: string;
  source: 'excel_id' | 'name';
};

type MaterialSnap = {
  byExcelId: Record<
    string,
    { name: string; printPrice: number | null; blankPrice: number | null; unit: string; family: string }
  >;
  byName: Record<string, { printPrice: number | null; blankPrice: number | null; excelRowId: string }>;
};

const snap = materialPrices as MaterialSnap;

function normalizeExcelId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const parsed = parseExcelIdColumn(raw);
  if (parsed.excelRowId) return formatExcelRowId(Number(parsed.excelRowId));
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return null;
  return formatExcelRowId(Number(digits));
}

/** Résout Vierge / Imprimé depuis Catalogue 2026 (jamais inventé). */
export function lookupCatalogue2026MaterialTariff(opts: {
  excelRowId?: string | null;
  label?: string | null;
  name?: string | null;
}): Catalogue2026MaterialTariff | null {
  const id = normalizeExcelId(opts.excelRowId);
  if (id && snap.byExcelId[id]) {
    const row = snap.byExcelId[id]!;
    return {
      printPrice: row.printPrice,
      blankPrice: row.blankPrice,
      excelRowId: id,
      name: row.name,
      source: 'excel_id',
    };
  }

  const label = opts.label ?? opts.name ?? '';
  const key = normalizeCataloguePriceKey(label);
  if (key && snap.byName[key]) {
    const row = snap.byName[key]!;
    return {
      printPrice: row.printPrice,
      blankPrice: row.blankPrice,
      excelRowId: row.excelRowId,
      source: 'name',
    };
  }

  // Match souple : libellé Admin contient le nom Excel exact (ex. « PCB 300g — rame »)
  if (key) {
    let best: Catalogue2026MaterialTariff | null = null;
    for (const [nameKey, row] of Object.entries(snap.byName)) {
      if (nameKey.length < 4) continue;
      if (key === nameKey || key.startsWith(`${nameKey} `) || key.includes(` ${nameKey} `)) {
        const candidate: Catalogue2026MaterialTariff = {
          printPrice: row.printPrice,
          blankPrice: row.blankPrice,
          excelRowId: row.excelRowId,
          source: 'name',
        };
        if (!best || nameKey.length > String(best.name ?? '').length) {
          best = { ...candidate, name: nameKey };
        }
      }
    }
    if (best) return best;
  }

  return null;
}
