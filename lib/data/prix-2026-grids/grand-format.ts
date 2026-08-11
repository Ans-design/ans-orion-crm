/** STUB grand format — aucun tarif Excel en runtime. Archive : archives/pricing/prix-2026-grids/grand-format.ts */
import type { Prix2026Lookup } from './types';

/** Map vide — tarifs historiques hors runtime uniquement. */
export const GF_PRIX2026_M2: Record<string, { price: number; sheet: string }> = {};

export const GF_PRIX2026_IDS: string[] = [];

export function entryGrandFormatPrix2026(_articleId: string): number | null {
  return null;
}

/**
 * Entrée catalogue Excel — stub null.
 * Live POS = moteurs surface / laize / bâche via calculatePrice.
 */
export function lookupGrandFormatPrix2026(
  _articleId: string,
  _config: Record<string, unknown>,
  _qty: number,
): Prix2026Lookup | null {
  return null;
}

export function getGrandFormatPrix2026Sheet(_articleId: string): string | null {
  return null;
}
