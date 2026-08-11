import {
  ARCHIVED_OPTION_SUFFIX,
  formatArchivedTextileValue,
} from '@/lib/pos/textile-pos-policy';

export { ARCHIVED_OPTION_SUFFIX };

export const GOODIES_ARCHIVED_FIELD_KEYS = new Set([
  'zone_marquage',
  'fichier_visuel',
  'note_emplacement_marquage',
  'note_production',
]);

const ARCHIVED_BY_ARTICLE: Record<string, Set<string>> = {
  'gd-mug': new Set(['matiere', 'zone_marquage']),
  'gd-briquet': new Set(['type', 'matiere', 'zone_marquage']),
  'gd-usb': new Set(['matiere', 'zone_marquage']),
  'gd-housse': new Set(['origine', 'matiere', 'zone_marquage']),
  'gd-parapluie': new Set(['type', 'poignee', 'zone_marquage']),
  'gd-pins': new Set(['finition', 'attache']),
  'gd-portecles': new Set(['finition']),
  'gd-tapis': new Set(['matiere_surface', 'base']),
  'gd-tasse': new Set(['soucoupe', 'zone_marquage']),
};

export function isGoodiesArticleId(articleId: string | null | undefined): boolean {
  return Boolean(articleId?.startsWith('gd-'));
}

export function isArchivedGoodiesFieldKey(
  fieldKey: string,
  articleId?: string | null,
): boolean {
  if (articleId && ARCHIVED_BY_ARTICLE[articleId]?.has(fieldKey)) return true;
  if (GOODIES_ARCHIVED_FIELD_KEYS.has(fieldKey)) return isGoodiesArticleId(articleId);
  return false;
}

export function shouldShowFieldInNewGoodiesDocuments(
  fieldKey: string,
  articleId?: string | null,
): boolean {
  return !isArchivedGoodiesFieldKey(fieldKey, articleId);
}

export function formatArchivedGoodiesValue(value: string): string {
  return formatArchivedTextileValue(value);
}

export const GOODIES_FIELD_LABELS: Record<string, string> = {
  type: 'Type',
  taille: 'Format / taille',
  format: 'Format / taille',
  capacite: 'Capacité',
  interface: 'Interface',
  couleur: 'Couleur',
  technique: 'Technique',
  remarques: 'Notes & remarques',
  fichier_joint: 'Fichier / visuel à joindre',
  note_production: 'Note production',
  note_emplacement_marquage: 'Précision emplacement / marquage',
  fichier_visuel: 'Fichier / visuel',
  zone_marquage: 'Zone de marquage',
  matiere: 'Matière',
  poignee: 'Poignée / manche',
  finition: 'Finition / effet',
  attache: 'Attache',
  matiere_surface: 'Matière de surface',
  base: 'Base antidérapante',
  soucoupe: 'Soucoupe / accessoire',
  diametre: 'Diamètre / format',
  encre: 'Couleur d\'encre',
  origine: 'Origine de la housse',
  qty: 'Quantité',
};

export function resolveGoodiesFieldLabel(fieldKey: string, fallback: string): string {
  return GOODIES_FIELD_LABELS[fieldKey] ?? fallback;
}
