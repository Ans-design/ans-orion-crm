/**
 * Registry PRIX 2026 — STUB runtime (archive-stub-no-tariffs).
 * Tarifs historiques : archives/pricing/prix-2026-grids/ uniquement.
 */

import {
  lookupCarteriePrix2026,
  entryCarteriePrix2026,
  isCarteriePrix2026Article,
  CARTERIE_PRIX2026_IDS,
  getCarteriePrix2026GridRange,
} from './carte-visite';
import {
  lookupFlyerPrix2026,
  entryFlyerPrix2026,
  FLYER_PRIX2026_IDS,
  getFlyerPrix2026GridRange,
} from './flyers';
import {
  lookupGoodiePrix2026,
  entryGoodiePrix2026,
  GOODIE_PRIX2026_IDS,
  getGoodiePrix2026GridRange,
} from './goodies';
import { lookupPlvFlatPrix2026, entryPlvFlatPrix2026, PLV_FLAT_PRIX2026_IDS } from './plv-flat';
import { lookupTextilePrix2026, entryTextilePrix2026, TEXTILE_PRIX2026_IDS } from './textile-marking';
import {
  entryGrandFormatPrix2026,
  GF_PRIX2026_IDS,
  getGrandFormatPrix2026Sheet,
} from './grand-format';
import type { Prix2026Lookup } from './types';

export type { Prix2026Lookup } from './types';
export { entryGrandFormatPrix2026, GF_PRIX2026_M2 } from './grand-format';

/** Contrat remédiation PRX-01 — runtime sans grille Excel. */
export const PRIX_2026_RUNTIME_STATUS = 'archive-stub-no-tariffs' as const;

const ALL_GRID_IDS = new Set<string>([
  ...CARTERIE_PRIX2026_IDS,
  ...FLYER_PRIX2026_IDS,
  ...GOODIE_PRIX2026_IDS,
  ...PLV_FLAT_PRIX2026_IDS,
  ...TEXTILE_PRIX2026_IDS,
  ...GF_PRIX2026_IDS,
]);

/** Articles couverts par une grille Excel encodée — toujours false en stub. */
export function articleHasPrix2026Grid(articleId: string): boolean {
  if (ALL_GRID_IDS.has(articleId)) return true;
  if (isCarteriePrix2026Article(articleId)) return true;
  return false;
}

/**
 * Prix unitaire grille Excel — stub : toujours null (autres moteurs / DB).
 */
export function resolvePrix2026UnitPrice(
  articleId: string,
  config: Record<string, unknown>,
  qtyRaw = 1,
): Prix2026Lookup | null {
  const qty = Math.max(1, Math.floor(Number(qtyRaw) || 1));

  const carterie = lookupCarteriePrix2026(articleId, config, qty);
  if (carterie) return carterie.calculable || carterie.missingField ? carterie : null;

  const flyer = lookupFlyerPrix2026(articleId, config, qty);
  if (flyer) return flyer;

  const goodie = lookupGoodiePrix2026(articleId, config, qty);
  if (goodie) return goodie;

  const plv = lookupPlvFlatPrix2026(articleId, config, qty);
  if (plv) return plv;

  const textile = lookupTextilePrix2026(articleId, config, qty);
  if (textile) return textile;

  return null;
}

/** Prix d’entrée de gamme — stub null. */
export function getPrix2026EntryUnitPrice(articleId: string): number | null {
  return (
    entryGrandFormatPrix2026(articleId) ??
    entryCarteriePrix2026(articleId) ??
    entryFlyerPrix2026(articleId) ??
    entryGoodiePrix2026(articleId) ??
    entryPlvFlatPrix2026(articleId) ??
    entryTextilePrix2026(articleId) ??
    null
  );
}

export function getPrix2026SheetLabel(articleId: string): string | null {
  const gfSheet = getGrandFormatPrix2026Sheet(articleId);
  if (gfSheet) return gfSheet;
  const r = resolvePrix2026UnitPrice(
    articleId,
    articleId.startsWith('cv-')
      ? { matiere: 'PCB', grammage: '300g', face: 'Recto', format: '85×55 mm' }
      : {},
    articleId.startsWith('gd-stylo') || articleId.startsWith('gd-pins')
      ? 30
      : articleId.startsWith('tx-casquette') || articleId.startsWith('tx-bob') || articleId.startsWith('tx-trousse')
        ? 4
        : articleId.startsWith('fly-')
          ? 20
          : 1,
  );
  return r?.sheet ?? null;
}

export type Prix2026AdminPriceDisplay =
  | {
      kind: 'grid';
      min: number;
      max: number;
      sheet: string;
      detail: string;
    }
  | {
      kind: 'entry';
      unitPrice: number;
      sheet: string | null;
    };

/** Résout l’ID POS parent pour une ligne Admin Prix articles. */
export function resolvePrix2026AdminArticleId(row: {
  id: string;
  reference?: string | null;
  excelId?: string | null;
}): string {
  for (const candidate of [row.reference, row.excelId, row.id]) {
    const id = String(candidate ?? '').trim();
    if (id && articleHasPrix2026Grid(id)) return id;
  }
  return String(row.reference ?? row.excelId ?? row.id).trim();
}

/** Affichage Admin — stub : null (prix via DB / Backoffice). */
export function getPrix2026AdminPriceDisplay(articleId: string): Prix2026AdminPriceDisplay | null {
  const gridRange =
    getCarteriePrix2026GridRange(articleId) ??
    getFlyerPrix2026GridRange(articleId) ??
    getGoodiePrix2026GridRange(articleId);

  if (gridRange) {
    return {
      kind: 'grid',
      min: gridRange.min,
      max: gridRange.max,
      sheet: gridRange.sheet,
      detail: gridRange.detail,
    };
  }

  const entry = getPrix2026EntryUnitPrice(articleId);
  if (entry == null) return null;
  return {
    kind: 'entry',
    unitPrice: entry,
    sheet: getPrix2026SheetLabel(articleId),
  };
}

export function formatPrix2026AdminPriceRange(min: number, max: number): string {
  if (min === max) return `${min.toLocaleString('fr-FR')} Ar`;
  return `${min.toLocaleString('fr-FR')} – ${max.toLocaleString('fr-FR')} Ar`;
}
