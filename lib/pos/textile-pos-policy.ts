/** Politique POS textile — champs archivés, libellés et affichage historique. */

export const TEXTILE_ARCHIVED_FIELD_KEYS = new Set([
  'zone_marquage',
  'coupe',
  'modele',
  'fermeture',
  'anses',
  'soufflet',
  'fichier_visuel',
  'note_emplacement_marquage',
  'note_production',
]);

const ARCHIVED_BY_ARTICLE: Record<string, Set<string>> = {
  'tx-trousse': new Set(['modele', 'fermeture', 'zone_marquage']),
  'tx-totebag': new Set(['modele', 'anses', 'soufflet', 'fermeture', 'zone_marquage']),
};

export function isTextileArticleId(articleId: string | null | undefined): boolean {
  return Boolean(articleId?.startsWith('tx-'));
}

export function isArchivedTextileFieldKey(
  fieldKey: string,
  articleId?: string | null,
): boolean {
  if (articleId && ARCHIVED_BY_ARTICLE[articleId]?.has(fieldKey)) return true;
  if (TEXTILE_ARCHIVED_FIELD_KEYS.has(fieldKey)) {
    if (fieldKey === 'modele' || fieldKey === 'fermeture' || fieldKey === 'anses' || fieldKey === 'soufflet') {
      return Boolean(articleId && ARCHIVED_BY_ARTICLE[articleId]?.has(fieldKey));
    }
    return isTextileArticleId(articleId);
  }
  return false;
}

export function shouldShowFieldInNewTextileDocuments(
  fieldKey: string,
  articleId?: string | null,
): boolean {
  return !isArchivedTextileFieldKey(fieldKey, articleId);
}

export const ARCHIVED_OPTION_SUFFIX = ' — Ancienne option utilisée (archivée)';

export function formatArchivedTextileValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (trimmed.includes('archivée')) return trimmed;
  return `${trimmed}${ARCHIVED_OPTION_SUFFIX}`;
}

export const TEXTILE_FIELD_LABELS: Record<string, string> = {
  format: 'Format / dimensions',
  format_marquage: 'Taille du marquage',
  matiere: 'Matière',
  grammage: 'Grammage',
  couleur: 'Couleur',
  doublure: 'Doublure intérieure',
  technique: 'Technique de personnalisation',
  remarques: 'Notes & remarques',
  fichier_joint: 'Fichier / visuel à joindre',
  note_production: 'Note production',
  note_emplacement_marquage: 'Précision emplacement / marquage',
  fichier_visuel: 'Fichier / visuel',
  qty: 'Quantité',
};

export function resolveTextileFieldLabel(fieldKey: string, fallback: string): string {
  return TEXTILE_FIELD_LABELS[fieldKey] ?? fallback;
}
