/** STUB flyers — aucun tarif Excel en runtime. Archive : archives/pricing/prix-2026-grids/flyers.ts */
import type { Prix2026Lookup } from './types';

export const FLYER_PRIX2026_IDS: string[] = [];

export function entryFlyerPrix2026(_articleId: string): number | null {
  return null;
}

export function lookupFlyerPrix2026(
  _articleId: string,
  _config: Record<string, unknown>,
  _qty: number,
): Prix2026Lookup | null {
  return null;
}

export function getFlyerPrix2026GridRange(_articleId: string): {
  min: number;
  max: number;
  sheet: string;
  detail: string;
} | null {
  return null;
}
