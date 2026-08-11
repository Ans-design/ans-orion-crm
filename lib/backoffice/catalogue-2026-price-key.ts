/** Clé normalisée pour matcher libellés Excel ↔ lignes Admin (accents / ponctuation). */

export function normalizeCataloguePriceKey(raw: string | null | undefined): string {
  return String(raw ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/×/g, 'x')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
