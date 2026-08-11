/** Article catalogue unique — bâche PVC, mesh, banderole (usage commercial). */
export const BACHE_CANONICAL_ID = 'gf-bache';

export { BACHE_ALIASES } from '@/lib/print/grand-format-laize-rules';

export const BACHE_TYPES = [
  'Bâche PVC standard',
  'Bâche PVC renforcée',
  'Mesh micro-perforé',
  'Autres',
] as const;

export type BacheType = (typeof BACHE_TYPES)[number];

export const BACHE_GRAMMAGES = ['270g', '440g', '510g', '650g', 'Autres'] as const;
export const BACHE_LAIZES = ['1m', '1m40', '1m60', '1m80', '2m40', '3m20', 'Autres'] as const;
export const BACHE_DOS = ['Dos blanc', 'Dos noir', 'Dos gris', 'Autres'] as const;
export const BACHE_ASPECTS = ['Mat', 'Brillant', 'Autres'] as const;

export const BACHE_TYPE_DEFAULT_GRAMMAGE: Record<string, string> = {
  'Mesh micro-perforé': '270g',
  'Bâche PVC standard': '440g',
  'Bâche PVC renforcée': '510g',
};

export const BACHE_LEGACY_IDS = [
  'gf-bache440',
  'gf-mesh',
  'gf-bache320',
  'GF001',
  'GF002',
  'GF003',
  'GF004',
  'GF005',
] as const;
export type BacheLegacyId = (typeof BACHE_LEGACY_IDS)[number];

export const BACHE_LEGACY_PREFILL: Record<
  BacheLegacyId,
  { type_bache?: BacheType; grammage?: string; laize?: string; format?: string }
> = {
  'gf-bache440': { type_bache: 'Bâche PVC standard', grammage: '440g', laize: '1m60' },
  'gf-mesh': { type_bache: 'Mesh micro-perforé', grammage: '270g', laize: '1m60' },
  'gf-bache320': { type_bache: 'Bâche PVC standard', grammage: '440g', laize: '3m20' },
  GF001: { type_bache: 'Bâche PVC standard', laize: '1m80', format: 'A4' },
  GF002: { type_bache: 'Bâche PVC standard', laize: '1m80', format: 'A3' },
  GF003: { type_bache: 'Bâche PVC standard', laize: '1m80', format: 'A2' },
  GF004: { type_bache: 'Bâche PVC standard', laize: '2m40', format: 'A0' },
  GF005: { type_bache: 'Bâche PVC standard', laize: '3m20', format: 'A0' },
};

/** Mots-clés recherche → pré-sélection configurateur. */
export const BACHE_SEARCH_PREFILL: Array<{
  patterns: RegExp;
  prefill: Partial<Record<string, string>>;
}> = [
  { patterns: /\bmesh\b/i, prefill: { type_bache: 'Mesh micro-perforé', grammage: '270g' } },
  { patterns: /\bbanderole\b|\bbanderole\b/i, prefill: { type_bache: 'Bâche PVC standard', grammage: '440g' } },
  { patterns: /\b320\b|\b3m20\b/i, prefill: { laize: '3m20' } },
  { patterns: /\b240\b|\b2m40\b/i, prefill: { laize: '2m40' } },
  { patterns: /\b180\b|\b1m80\b/i, prefill: { laize: '1m80' } },
  { patterns: /\b160\b|\b1m60\b/i, prefill: { laize: '1m60' } },
  { patterns: /\b140\b|\b1m40\b/i, prefill: { laize: '1m40' } },
  { patterns: /\b440\b|\b440g\b/i, prefill: { type_bache: 'Bâche PVC standard', grammage: '440g' } },
  { patterns: /\b270\b|\b270g\b/i, prefill: { type_bache: 'Mesh micro-perforé', grammage: '270g' } },
  { patterns: /\bdos\s*noir\b|\bnoir\b/i, prefill: { dos: 'Dos noir' } },
  { patterns: /\bdos\s*blanc\b|\bblanc\b/i, prefill: { dos: 'Dos blanc' } },
  { patterns: /\bdos\s*gris\b|\bgris\b/i, prefill: { dos: 'Dos gris' } },
  { patterns: /\bbrillant\b/i, prefill: { aspect: 'Brillant' } },
  { patterns: /\bmat\b|\bmate\b/i, prefill: { aspect: 'Mat' } },
  { patterns: /\brenforc/i, prefill: { type_bache: 'Bâche PVC renforcée', grammage: '510g' } },
];

export function isBacheLegacyId(articleId: string): articleId is BacheLegacyId {
  return (BACHE_LEGACY_IDS as readonly string[]).includes(articleId);
}

export function isBacheArticleId(articleId: string): boolean {
  return articleId === BACHE_CANONICAL_ID || isBacheLegacyId(articleId);
}

export function resolveBacheCanonicalId(articleId: string): string {
  if (isBacheLegacyId(articleId)) return BACHE_CANONICAL_ID;
  return articleId;
}

export function bacheLegacyPrefill(articleId: string): Record<string, string> | null {
  if (!isBacheLegacyId(articleId)) return null;
  return BACHE_LEGACY_PREFILL[articleId] as Record<string, string>;
}

export function bacheSearchPrefill(query: string): Record<string, string> | null {
  const q = query.trim();
  if (!q) return null;
  for (const { patterns, prefill } of BACHE_SEARCH_PREFILL) {
    if (patterns.test(q)) return prefill as Record<string, string>;
  }
  if (/b[aâ]che/i.test(q)) return {};
  return null;
}

export function bacheSearchMatches(itemId: string, itemName: string, itemDesc: string, query: string): boolean {
  if (itemId !== BACHE_CANONICAL_ID) return false;
  const q = query.toLowerCase().trim();
  if (!q) return true;
  const hay = `${itemName} ${itemDesc} bache bâche banderole mesh dos blanc noir gris mat brillant 440 270 320 240 160`.toLowerCase();
  if (hay.includes(q)) return true;
  return BACHE_SEARCH_PREFILL.some(({ patterns }) => patterns.test(q));
}
