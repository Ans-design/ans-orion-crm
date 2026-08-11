/** Alias Acrylic / Plexiglas → article canonique gf-plexi. */
export const PLEXI_CANONICAL_ID = 'gf-plexi';

export const PLEXI_LEGACY_IDS = ['gf-acrylic', 'GF010', 'gf-plexiglass', 'gf-plexiglas'] as const;

export function resolvePlexiCanonicalId(articleId: string): string {
  if ((PLEXI_LEGACY_IDS as readonly string[]).includes(articleId)) return PLEXI_CANONICAL_ID;
  return articleId;
}

export function plexiLegacyPrefill(articleId: string): Record<string, string> | null {
  if (articleId === 'gf-acrylic' || articleId === 'GF010') {
    return { type_support: 'Acrylic', epaisseur: '3mm' };
  }
  return null;
}
