/**
 * Complète Vierge / Marge / Imprimé manquants pour Articles finis.
 * Source : grilles PRIX 2026 encodées + Catalogue Articles 2026 Excel (audit).
 * N’écrase jamais une valeur déjà renseignée (> 0). N’invente pas de prix marché MG.
 */

import {
  getPrix2026AdminPriceDisplay,
  resolvePrix2026AdminArticleId,
} from '@/lib/data/prix-2026-grids';
import { resolvePosCatalogEntryPrice } from '@/lib/pos/pos-catalog-entry-price';
import { resolveCatalogueArticles2026PrintedEntry } from '@/lib/backoffice/catalogue-articles-2026-entry-lookup';
import type { PrixArticleBaseRow } from '@/lib/backoffice/prix-articles-variant-rows';
import { deriveMarginPercent } from '@/lib/backoffice/prix-articles-excel-format';

/** Part du prix imprimé attribuable au support vierge (dérivation après match Excel). */
function blankRatioForFamily(category: string, name: string): number {
  const hay = `${category} ${name}`.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  if (/conception|graphisme|design|creation|création/.test(hay)) return 0;
  if (/packaging|doypack|gobelet/.test(hay)) return 0.62;
  if (/goodie|stylo|mug|pins|usb/.test(hay)) return 0.55;
  if (/textile|t-?shirt|polo|casquette|bob/.test(hay)) return 0.5;
  if (/plv|roll.?up|kakemono|bache|bâche|grand.?format/.test(hay)) return 0.45;
  if (/carterie|carte.?visite|flyer|document|calendrier|photo/.test(hay)) return 0.4;
  return 0.42;
}

function catalogIdOf(row: PrixArticleBaseRow): string {
  return String(row.reference ?? row.excelId ?? row.id)
    .replace(/^pos-catalog:/, '')
    .trim();
}

function resolvePrintedAr(row: PrixArticleBaseRow): number | null {
  if (row.unitPrice > 0) return Math.round(row.unitPrice);

  const id = catalogIdOf(row);
  const display = getPrix2026AdminPriceDisplay(
    resolvePrix2026AdminArticleId({
      id,
      reference: row.reference,
      excelId: row.excelId,
    }),
  );
  if (display?.kind === 'grid' && display.min > 0) return Math.round(display.min);
  if (display?.kind === 'entry' && display.unitPrice > 0) return Math.round(display.unitPrice);

  const entry = resolvePosCatalogEntryPrice(id);
  if (entry != null && entry > 0) return Math.round(entry);

  const fromArticlesExcel = resolveCatalogueArticles2026PrintedEntry({
    posId: id,
    reference: row.reference,
    excelId: row.excelId,
    name: row.name,
  });
  if (fromArticlesExcel != null && fromArticlesExcel > 0) return fromArticlesExcel;

  return null;
}

function resolveBlankAr(row: PrixArticleBaseRow, printed: number | null): number | null {
  if (row.blankUnitPrice != null && Number(row.blankUnitPrice) > 0) {
    return Math.round(Number(row.blankUnitPrice));
  }

  // Vierge dérivé uniquement si un imprimé Excel / grille est connu — pas d’invention MG.
  if (printed != null && printed > 0) {
    const ratio = blankRatioForFamily(row.category, row.name);
    if (ratio <= 0) return null;
    return Math.max(1, Math.round(printed * ratio));
  }

  return null;
}

/** Remplit uniquement les trous Vierge / Imprimé (marge dérivée). */
export function fillEmptyPrixArticleTariffs<T extends PrixArticleBaseRow>(rows: T[]): T[] {
  return rows.map((row) => {
    const printed = resolvePrintedAr(row);
    const blank = resolveBlankAr(row, printed);

    const nextUnit = row.unitPrice > 0 ? row.unitPrice : (printed ?? 0);
    const nextBlank =
      row.blankUnitPrice != null && Number(row.blankUnitPrice) > 0
        ? row.blankUnitPrice
        : blank;

    if (nextUnit === row.unitPrice && nextBlank === row.blankUnitPrice) {
      return row;
    }

    const marginPercent =
      nextBlank != null && nextUnit > 0
        ? deriveMarginPercent(nextBlank, nextUnit)
        : row.marginPercent;

    return {
      ...row,
      unitPrice: nextUnit,
      blankUnitPrice: nextBlank,
      marginPercent,
    };
  });
}
