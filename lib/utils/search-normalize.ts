/**
 * Recherche tolérante — insensible casse/accents, fragments internes.
 */
export function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchesSearchQuery(haystack: string, query: string): boolean {
  const nq = normalizeSearchText(query);
  if (!nq) return true;
  return normalizeSearchText(haystack).includes(nq);
}

export function matchesSearchFields(
  fields: (string | number | boolean | null | undefined)[],
  query: string,
): boolean {
  const nq = normalizeSearchText(query);
  if (!nq) return true;
  const combined = normalizeSearchText(
    fields.filter((f) => f != null && f !== '').map(String).join(' '),
  );
  return combined.includes(nq);
}

export function buildChipRowSearchBlob(row: {
  articleId?: string;
  articleLabel?: string;
  articleFamily?: string;
  blockKey?: string;
  blockLabel?: string;
  fieldKey?: string;
  label?: string;
  source?: string;
}): string {
  return [
    row.articleId,
    row.articleLabel,
    row.articleFamily,
    row.blockKey,
    row.blockLabel,
    row.fieldKey,
    row.label,
    row.source,
  ].filter(Boolean).join(' ');
}

export function buildArticleSearchBlob(a: {
  articleId: string;
  articleLabel: string;
  family: string;
  category?: string;
  status?: string;
  dataSource?: string;
}): string {
  return [a.articleId, a.articleLabel, a.family, a.category, a.status, a.dataSource].filter(Boolean).join(' ');
}
