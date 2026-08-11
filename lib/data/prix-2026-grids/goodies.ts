/** STUB goodies — aucun tarif Excel en runtime. */
import type { Prix2026Lookup } from './types';

export const GOODIE_PRIX2026_IDS: string[] = [];

export function entryGoodiePrix2026(_articleId: string): number | null {
  return null;
}

export function lookupGoodiePrix2026(
  _articleId: string,
  _config: Record<string, unknown>,
  _qty: number,
): Prix2026Lookup | null {
  return null;
}

export function getGoodiePrix2026GridRange(_articleId: string): {
  min: number;
  max: number;
  sheet: string;
  detail: string;
} | null {
  return null;
}
