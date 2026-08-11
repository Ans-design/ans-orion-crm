/** Article catalogue unique — livres, booklets, magazines, menus, mémoires. */
export const LIVRES_CANONICAL_ID = 'bk-livres';

export const LIVRES_TYPES = [
  'Booklet',
  'Livret',
  'Fascicule',
  'Magazine',
  'Menu simple',
  'Menu livret',
  'Menu plastifié',
  'Livre broché',
  'Livre relié',
  'Livre de poche',
  'Livre cartonné',
  'Mémoire / thèse',
  'Publication personnalisée',
] as const;

export type LivresType = (typeof LIVRES_TYPES)[number];

export const LIVRES_MENU_TYPES: LivresType[] = [
  'Menu simple',
  'Menu livret',
  'Menu plastifié',
];

export const LIVRES_LEGACY_IDS = [
  'bk-booklet',
  'bk-livret',
  'bk-fascicule',
  'bk-magazine',
  'bk-menu',
] as const;

export type LivresLegacyId = (typeof LIVRES_LEGACY_IDS)[number];

export const LIVRES_LEGACY_PREFILL: Record<LivresLegacyId, { type: LivresType }> = {
  'bk-booklet': { type: 'Booklet' },
  'bk-livret': { type: 'Livret' },
  'bk-fascicule': { type: 'Fascicule' },
  'bk-magazine': { type: 'Magazine' },
  'bk-menu': { type: 'Menu simple' },
};

export function isLivresLegacyId(articleId: string): articleId is LivresLegacyId {
  return (LIVRES_LEGACY_IDS as readonly string[]).includes(articleId);
}

export function resolveLivresCanonicalId(articleId: string): string {
  if (isLivresLegacyId(articleId)) return LIVRES_CANONICAL_ID;
  return articleId;
}

export function livresLegacyPrefill(articleId: string): { type: LivresType } | null {
  if (!isLivresLegacyId(articleId)) return null;
  return LIVRES_LEGACY_PREFILL[articleId];
}

export function isLivresMenuType(type: string): boolean {
  return (LIVRES_MENU_TYPES as readonly string[]).includes(type);
}

/** Types avec intérieur + couverture distincts */
export function livresTypesWithCover(): LivresType[] {
  return LIVRES_TYPES.filter(
    (t) => !isLivresMenuType(t) && t !== 'Publication personnalisée',
  );
}

/** Types avec champ « pages » (hors menus) */
export function livresTypesWithPages(): LivresType[] {
  return livresTypesWithCover();
}
