/**
 * Libellés Catalogue — affichage métier sans préfixes techniques de fusion.
 */

const ARCHIVED_PREFIX_RE = /^\[archivé→[^\]]*\]\s*/i;

/** True si le libellé porte un préfixe de fusion archive. */
export function isArchivedDisplayLabel(label: string | null | undefined): boolean {
  return ARCHIVED_PREFIX_RE.test((label ?? '').trim());
}

/**
 * Retire `[archivé→…]` pour l’UI standard.
 * Conserve le libellé d’origine si le strip laisse une chaîne vide.
 */
export function stripArchivedDisplayPrefix(label: string | null | undefined): string {
  const raw = (label ?? '').trim();
  if (!raw) return '';
  const stripped = raw.replace(ARCHIVED_PREFIX_RE, '').trim();
  return stripped || raw;
}

/** Article traité comme archivé (inactif, statut archived, ou préfixe de fusion). */
export function isCatalogueArticleArchived(article: {
  active?: boolean;
  status?: string;
  articleLabel?: string | null;
}): boolean {
  if (article.active === false) return true;
  if ((article.status ?? '').toLowerCase() === 'archived') return true;
  return isArchivedDisplayLabel(article.articleLabel);
}
