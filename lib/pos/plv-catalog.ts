/** Résolution catalogue PLV — fusion des articles redondants. */

export const PLV_CANONICAL_IDS = [
  'plv-chevalet',
  'plv-rollup',
  'plv-xbanner',
  'plv-presentoir-sol',
  'plv-porte-flyers',
  'plv-porte-affiches',
  'plv-presentoir-magasin',
  'plv-oriflamme',
] as const;

export type PlvCanonicalId = (typeof PLV_CANONICAL_IDS)[number];

/** IDs legacy → article canonique. */
export const PLV_LEGACY_TO_CANONICAL: Record<string, PlvCanonicalId> = {
  'plv-chevalet-table': 'plv-chevalet',
  'plv-chevalet-plv': 'plv-chevalet',
  'plv-chevalet-carton': 'plv-chevalet',
  'plv-stop': 'plv-presentoir-sol',
  'plv-totem-sol': 'plv-presentoir-sol',
  'plv-porte-brochures': 'plv-porte-flyers',
  'plv-fronton': 'plv-porte-affiches',
  'plv-comptoir-escalier': 'plv-presentoir-magasin',
  'plv-box-palette': 'plv-presentoir-magasin',
  'plv-colonne': 'plv-presentoir-magasin',
  'plv-sur-mesure': 'plv-presentoir-magasin',
  /** Doublons GrandFormatPricing / DirectSale → configurateurs PLV */
  GF013: 'plv-rollup',
  GF014: 'plv-xbanner',
  AVD008: 'plv-rollup',
  AVD009: 'plv-rollup',
  AVD011: 'plv-xbanner',
};

export const PLV_LEGACY_IDS = Object.keys(PLV_LEGACY_TO_CANONICAL) as (keyof typeof PLV_LEGACY_TO_CANONICAL)[];

/** Pré-remplissage configurateur depuis une URL legacy (champ `type`, pas `modele`). */
export const PLV_LEGACY_PREFILL: Record<string, Record<string, string>> = {
  'plv-chevalet-table': { type: 'Chevalet de table' },
  'plv-chevalet-plv': { type: 'Chevalet de table' },
  'plv-chevalet-carton': { type: 'Chevalet carton stop-rayon' },
  'plv-stop': { type: 'Stop-trottoir A' },
  'plv-totem-sol': { type: 'Totem de sol' },
  'plv-porte-brochures': { type: 'Porte-brochures carton' },
  'plv-fronton': { type: 'Fronton + étagères' },
  'plv-comptoir-escalier': { type: 'Comptoir / Escalier' },
  'plv-box-palette': { type: 'Box palette / Bac de sol' },
  'plv-colonne': { type: 'Colonne tournante' },
  'plv-sur-mesure': { type: 'Présentoir sur mesure' },
  GF013: { type: 'Roll-up standard', format: '80×200 cm' },
  GF014: { type: 'X-Banner standard', format: '80×200 cm' },
  AVD008: { type: 'Roll-up standard', format: '80×200 cm' },
  AVD009: { type: 'Roll-up deluxe / premium', format: '85×200 cm' },
  AVD011: { type: 'X-Banner standard', format: '80×200 cm' },
};

export function isPlvLegacyId(articleId: string): boolean {
  return articleId in PLV_LEGACY_TO_CANONICAL;
}

export function resolvePlvCanonicalId(articleId: string): string {
  return PLV_LEGACY_TO_CANONICAL[articleId] ?? articleId;
}

export function plvLegacyPrefill(articleId: string): Record<string, string> | null {
  return PLV_LEGACY_PREFILL[articleId] ?? null;
}

export function plvLegacyRedirectTarget(articleId: string): string | null {
  return PLV_LEGACY_TO_CANONICAL[articleId] ?? null;
}
