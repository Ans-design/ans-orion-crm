import { containsQ } from '@/lib/prisma-filters';

/** Longueur minimale pour déclencher une recherche SQL (évite les scans inutiles). */
export const SEARCH_MIN_CHARS = 2;

/** Plafond pour éviter les requêtes LIKE géantes. */
export const SEARCH_MAX_CHARS = 120;

/** Normalise un terme de recherche — `undefined` si trop court ou vide. */
export function normalizeSearchTerm(raw?: string | null): string | undefined {
  const term = raw?.trim();
  if (!term || term.length < SEARCH_MIN_CHARS) return undefined;
  return term.slice(0, SEARCH_MAX_CHARS);
}

type FieldBuilder = (q: string) => Record<string, unknown>;

/**
 * Construit un tableau OR Prisma pour recherche texte multi-champs.
 * Compatible SQLite (local) et PostgreSQL (prod) via `containsQ`.
 */
export function buildTextSearchOr(
  raw: string | undefined,
  fields: FieldBuilder[],
): Record<string, unknown>[] | undefined {
  const q = normalizeSearchTerm(raw);
  if (!q || fields.length === 0) return undefined;
  return fields.map((fn) => fn(q));
}

/** Applique un OR texte sur des champs racine du modèle Prisma. */
export function applyTextSearchWhere(
  where: Record<string, unknown>,
  raw: string | undefined,
  fieldNames: string[],
): void {
  const searchOr = buildTextSearchOr(
    raw,
    fieldNames.map((field) => (q) => ({ [field]: containsQ(q) })),
  );
  if (searchOr) where.OR = searchOr;
}
