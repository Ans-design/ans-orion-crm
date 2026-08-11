/** STUB PLV flat — aucun tarif Excel en runtime. */
import type { Prix2026Lookup } from './types';

export const PLV_FLAT_PRIX2026_IDS: string[] = [];

export function entryPlvFlatPrix2026(_articleId: string): number | null {
  return null;
}

export function lookupPlvFlatPrix2026(
  _articleId: string,
  _config: Record<string, unknown>,
  _qty: number,
): Prix2026Lookup | null {
  return null;
}
