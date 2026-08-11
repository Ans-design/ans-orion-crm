export const DOC_AUTOCOPIANT_CANONICAL_ID = 'doc-carnet';

const LEGACY_FACTURIER_PREFILL = { type: 'Facturier' } as const;
const RECU_PREFILL = { type: 'Carnet de reçus' } as const;

export function isAutocopiantLegacyId(articleId: string): boolean {
  return articleId === 'doc-facturier' || articleId === 'doc-recu';
}

export function resolveAutocopiantCanonicalId(articleId: string): string {
  if (articleId === 'doc-facturier' || articleId === 'doc-recu') return DOC_AUTOCOPIANT_CANONICAL_ID;
  return articleId;
}

export function autocopiantLegacyPrefill(articleId: string): Record<string, string> | null {
  if (articleId === 'doc-facturier') return { ...LEGACY_FACTURIER_PREFILL };
  if (articleId === 'doc-recu') return { ...RECU_PREFILL };
  return null;
}

export function autocopiantLegacyRedirectTarget(articleId: string): string | null {
  if (articleId === 'doc-facturier' || articleId === 'doc-recu') return DOC_AUTOCOPIANT_CANONICAL_ID;
  return null;
}

export function autocopiantLegacyRedirectParams(
  articleId: string,
  searchParams: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(searchParams.toString());
  const prefill = autocopiantLegacyPrefill(articleId);
  if (prefill) {
    for (const [key, val] of Object.entries(prefill)) {
      params.set(key, val);
    }
  }
  return params;
}
