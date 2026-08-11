/**
 * Complète Prix matière / Marge / Prix imprimé manquants.
 * Source unique : Catalogue 2026 Excel (audit PRIX 2026 consolidé).
 * N’écrase jamais une valeur déjà renseignée. N’invente pas de prix hors Excel.
 */

import {
  resolveBlankSellPrice,
  resolvePrintPrice,
  computePrintPriceFromParts,
} from '@/lib/backoffice/material-price-semantics';
import { lookupCatalogue2026MaterialTariff } from '@/lib/backoffice/catalogue-2026-material-lookup';

/** Ratio matière / imprimé — uniquement pour déduire le trou opposé APRÈS match Excel. */
function blankToPrintRatio(family: string | null | undefined, label: string): number {
  const hay = `${family ?? ''} ${label}`.toLowerCase();
  if (/b[aâ]che|vinyle|mesh|grand\s*format|m²|m2/.test(hay)) return 1.35;
  if (/pvc|plex|forex|dibond|rigide/.test(hay)) return 1.45;
  if (/pcb|pcm|glossy|bristol|couch|carterie|carte/.test(hay)) return 1.55;
  if (/offset|kraft|ncr|papier|flyer|document/.test(hay)) return 1.5;
  return 1.48;
}

export type MaterialTariffFillRow = {
  blankSellPrice?: number | null;
  maxPrice?: number | null;
  basePrintPrice?: number | null;
  family?: string | null;
  label?: string | null;
  name?: string | null;
  excelRowId?: string | null;
};

/** Remplit uniquement les trous — retourne un patch partiel (Excel Catalogue 2026). */
export function fillEmptyMaterialTariffPatch<T extends MaterialTariffFillRow>(
  row: T,
): Partial<Pick<T, 'blankSellPrice' | 'basePrintPrice'>> {
  const label = String(row.label ?? row.name ?? '');
  const family = row.family ?? null;
  const hadBlank = resolveBlankSellPrice(row) != null;
  const hadPrint = resolvePrintPrice(row) != null;

  if (hadBlank && hadPrint) return {};

  let blank = resolveBlankSellPrice(row);
  let print = resolvePrintPrice(row);

  const excel = lookupCatalogue2026MaterialTariff({
    excelRowId: row.excelRowId,
    label,
    name: row.name,
  });

  if (excel) {
    if (print == null && excel.printPrice != null && excel.printPrice > 0) {
      print = Math.round(excel.printPrice);
    }
    if (blank == null && excel.blankPrice != null && excel.blankPrice > 0) {
      blank = Math.round(excel.blankPrice);
    }
    // Excel n’a souvent que l’imprimé : déduire matière par ratio métier (trou seulement)
    if (blank == null && print != null && print > 0) {
      const ratio = blankToPrintRatio(family, label);
      blank = Math.max(1, Math.round(print / ratio));
      if (blank > print) blank = Math.max(1, Math.round(print * 0.65));
    }
    if (print == null && blank != null && blank >= 0) {
      print = computePrintPriceFromParts(
        blank,
        Math.round(blank * (blankToPrintRatio(family, label) - 1)),
        0,
      );
    }
  }

  const patch: Partial<Pick<T, 'blankSellPrice' | 'basePrintPrice'>> = {};
  if (!hadBlank && blank != null) patch.blankSellPrice = blank as T['blankSellPrice'];
  if (!hadPrint && print != null) patch.basePrintPrice = print as T['basePrintPrice'];
  return patch;
}

export function fillEmptyMaterialTariffs<T extends MaterialTariffFillRow>(rows: T[]): T[] {
  return rows.map((row) => {
    const patch = fillEmptyMaterialTariffPatch(row);
    if (!Object.keys(patch).length) return row;
    return { ...row, ...patch } as T;
  });
}
