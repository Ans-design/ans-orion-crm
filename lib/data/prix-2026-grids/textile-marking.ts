/** STUB textile — aucun tarif Excel en runtime. */
import type { Prix2026Lookup } from './types';

export const TEXTILE_PRIX2026_IDS: string[] = [];

export function entryTextilePrix2026(_articleId: string): number | null {
  return null;
}

export function lookupTextilePrix2026(
  _articleId: string,
  _config: Record<string, unknown>,
  _qty: number,
): Prix2026Lookup | null {
  return null;
}
