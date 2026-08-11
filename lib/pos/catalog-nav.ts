import { CAT_LABELS } from '@/lib/data/catalogue';

const VALID_LIST_CATS = new Set(['tous', 'favoris', 'recents', 'top', ...Object.keys(CAT_LABELS)]);

export function isValidPosListCat(cat: string | null | undefined): cat is string {
  return !!cat && VALID_LIST_CATS.has(cat);
}

/** URL liste POS filtrée par catégorie (ou catalogue complet). */
export function posCatalogHref(cat?: string | null): string {
  if (!cat || cat === 'tous' || !isValidPosListCat(cat)) return '/pos';
  return `/pos?cat=${encodeURIComponent(cat)}`;
}

/** URL configurateur article avec contexte catégorie pour le retour. */
export function posProductHref(articleId: string, cat?: string | null): string {
  const base = `/pos/${articleId}`;
  if (!cat || cat === 'tous' || !isValidPosListCat(cat)) return base;
  return `${base}?cat=${encodeURIComponent(cat)}`;
}

/** Libellé du bouton retour selon la catégorie parente. */
export function posBackLabel(cat?: string | null): string {
  if (cat === 'favoris') return 'Retour aux favoris';
  if (cat === 'recents') return 'Retour aux récents';
  if (cat === 'top') return 'Retour aux plus vendus';
  if (cat && cat !== 'tous' && isValidPosListCat(cat)) {
    return `Retour — ${CAT_LABELS[cat] ?? cat}`;
  }
  return 'Retour au catalogue';
}

/** Catégorie de retour : query `cat` ou catégorie article. */
export function resolvePosBackCat(queryCat: string | null, articleCategory?: string | null): string {
  if (isValidPosListCat(queryCat)) return queryCat;
  if (articleCategory && isValidPosListCat(articleCategory)) return articleCategory;
  return 'tous';
}

/** Préserve un paramètre query (ex. ?commande=) dans les liens POS. */
export function appendPosQueryParam(href: string, key: string, value: string | null | undefined): string {
  if (!value?.trim()) return href;
  const [path, qs] = href.split('?');
  const p = new URLSearchParams(qs ?? '');
  p.set(key, value.trim());
  return `${path}?${p.toString()}`;
}
