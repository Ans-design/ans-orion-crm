/** STUB carterie — aucun tarif Excel en runtime. */
import type { Prix2026Lookup } from './types';

export const CARTERIE_PRIX2026_IDS: string[] = [];

export function isCarteriePrix2026Article(_articleId: string): boolean {
  return false;
}

export function entryCarteriePrix2026(_articleId: string): number | null {
  return null;
}

export function lookupCarteriePrix2026(
  _articleId: string,
  _config: Record<string, unknown>,
  _qty: number,
): Prix2026Lookup | null {
  return null;
}

export function getCarteriePrix2026GridRange(_articleId: string): {
  min: number;
  max: number;
  sheet: string;
  detail: string;
} | null {
  return null;
}
