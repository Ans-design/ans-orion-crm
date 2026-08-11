/** Article catalogue unique pour tous les bloc-notes et agendas. */
export const BLOC_NOTE_CANONICAL_ID = 'bn-bloc-note';

/** IDs historiques (URLs / panier) → article canonique. */
export const BLOC_NOTE_LEGACY_IDS = [
  'bn-a4',
  'bn-b5',
  'bn-a5',
  'bn-a6',
  'bn-agenda',
] as const;

export type BlocNoteLegacyId = (typeof BLOC_NOTE_LEGACY_IDS)[number];

export const BLOC_NOTE_LEGACY_PREFILL: Record<
  BlocNoteLegacyId,
  { format: string; produit: string }
> = {
  'bn-a4': { format: 'A4', produit: 'Bloc-note' },
  'bn-b5': { format: 'B5', produit: 'Bloc-note' },
  'bn-a5': { format: 'A5', produit: 'Bloc-note' },
  'bn-a6': { format: 'A6', produit: 'Bloc-note' },
  'bn-agenda': { format: 'A5', produit: 'Agenda' },
};

export function isBlocNoteLegacyId(articleId: string): articleId is BlocNoteLegacyId {
  return (BLOC_NOTE_LEGACY_IDS as readonly string[]).includes(articleId);
}

export function resolveBlocNoteCanonicalId(articleId: string): string {
  if (isBlocNoteLegacyId(articleId)) return BLOC_NOTE_CANONICAL_ID;
  return articleId;
}

export function blocNoteLegacyPrefill(
  articleId: string,
): { format: string; produit: string } | null {
  if (!isBlocNoteLegacyId(articleId)) return null;
  return BLOC_NOTE_LEGACY_PREFILL[articleId];
}
