/**
 * Séparation ORION / Print O'Clock-like :
 * - Matières = supports bruts (papiers intérieur/couverture, vinyles, bâches, plaques…)
 *   qui composent les articles complexes (livre, flyer multi-couches, grand format…)
 * - Articles finis / Catalogue POS = produits commerciaux complets
 *   (Flyer A5, Carte de visite, T-shirt, Roll-up…) — vendus tels quels, sans choix de matière brute
 *
 * Zéro suppression de routes : les lignes mal placées sont filtrées / archivées.
 */

import { normalizeDirectSaleCategory } from '@/lib/direct-sale/categories';

/** Produits finis — ne doivent jamais figurer dans la liste Matières active. */
export const FINISHED_PRODUCT_AS_MATERIAL_RE =
  /roll[\s-]?up|kak[eé]mono|x[\s-]?banner|\boriflamme\b|\bstylo\b|\bmug\b|\bpins?\b|\bgourde\b|\bcasquette\b|\bbob\b|\btrousse\b|\btote\s*bag\b|\bsweat\b|\bt[\s-]?shirt\b|\bpolo\b|\bflyer\b|\bprospectus\b|\bd[eé]pliant\b|\bcarte\s+de\s+visite\b|\bcarte\s+fid[eé]lit|\bplaque\s+pvc\s+imprim|\bplaque\s+plexiglass\s+imprim|\bcalendrier\b|\bbloc[\s-]?note\b|\bhangtag\b|\bbadge\b|\bsac\s+papier\b|\bgoodies?\b|\btextile\b|\bmaillot\b|\bchevalet\s+(plv|table|bureau)\b|\bpresentoir\b|\bpr[eé]sentoir\b|\bstop[\s-]?trottoir\b|\btotem\b|\bporte[\s-]?flyer\b|\bporte[\s-]?affiche\b|\bpapier\s+en[\s-]?t[eê]te\b|\ben[\s-]?t[eê]te\b/i;

/**
 * Supports de calcul légitimes (même si le libellé contient un mot ambigu).
 * Aligné Print O'Clock : papiers + souples (bâche/vinyle) + rigides bruts.
 */
export function isBaseSubstrateMaterial(label: string | null | undefined): boolean {
  const n = String(label ?? '').trim();
  if (!n) return false;

  // Services / finitions / produits imprimés finis → jamais « matière »
  if (
    /finition\s+papier|pelliculage|plastification|collage\s+format|montage\s+complet|d[eé]coupe\s+photo|pose\s+autocollant|dos\s+carr[eé]|piq[uû]re\s+[aà]\s+cheval|reliure\s+(plastique|m[eé]tall)|tirage\s+photo/i.test(
      n,
    )
  ) {
    return false;
  }
  if (FINISHED_PRODUCT_AS_MATERIAL_RE.test(n) && !/^(pcb|pcm|glossy|bristol|couch|kraft|offset|standard|b[aâ]che|vinyle|pvc\s+\d)/i.test(n)) {
    // « Carte de visite » seul = produit ; « PVC opaque 1mm » = support
    if (/carte\s+de\s+visite|flyer|roll|t[\s-]?shirt|stylo|plaque\s+\w+\s+imprim/i.test(n)) return false;
  }

  // Papiers petit format / livres / devis ISF
  if (
    /^(offset|standard|pcb|pcm|glossy|bristol|couch[eé]|kraft|journal|mat\b|satin|textur|toile\s*fin|invitation|autocopiant|contre[\s-]?coll|ncr\b|sp[eé]cial\s+invitation)/i.test(
      n,
    )
  ) {
    return true;
  }
  if (/\bpapier\b/i.test(n) && !/personnalis|imprim[eé]\s+sur\s+mesure|en[\s-]?t[eê]te/i.test(n)) return true;
  if (/^carton\s+rigide\b|^matera?i[eè]re\s+personnalis/i.test(n)) return true;

  // Grand format souples / films (m² / laize)
  if (
    /^b[aâ]che\b|^vinyle\b|^pp\s+film|^mesh\b|^toile\s*(infroiss|polyester)|lino\b|^backlit\b|^canvas\b|^dos\s+bleu\b|^film\s+r[eé]fl[eé]ch|^frosted\b|^one[\s-]?way\b|^tissu\s+drapeau\b/i.test(
      n,
    )
  ) {
    return true;
  }

  // Rigides bruts (pas « plaque PVC imprimée A4 »)
  if (/^pvc\s+\d+\s*mm\b|^acrylic\s+\d|^plexiglas|^plex[iy]\b|^forex\b|^dibond\b|^akylux\b|^carton\s+plume|^alu\b/i.test(n)) {
    return true;
  }
  if (/\bpvc\s+(opaque|translucide|rigide)\b|\bplaque\s+pvc\b(?!\s*imprim)/i.test(n) && !/imprim/i.test(n)) {
    return true;
  }

  return false;
}

/** Libellé matière = produit fini commercial (à exclure de Matières). */
export function isFinishedProductMisplacedAsMaterial(label: string | null | undefined): boolean {
  const n = String(label ?? '').trim();
  if (!n) return false;
  if (isBaseSubstrateMaterial(n)) return false;
  return FINISHED_PRODUCT_AS_MATERIAL_RE.test(n);
}

/** Familles DB à exclure de la liste Matières (services devis, pas supports). */
export function isNonSubstrateMaterialFamily(family: string | null | undefined): boolean {
  const f = String(family ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return f === 'service' || f === 'reliure' || f === 'imprime' || f === 'imprimé';
}

/** Normalise un libellé pour comparaison Articles finis ↔ Matières. */
export function normalizeMaterialConflictKey(label: string | null | undefined): string {
  return String(label ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Interdit en Matières si le libellé correspond à un article fini déjà catalogue.
 * Les supports bruts (PCB, bâche…) restent autorisés.
 */
export function conflictsWithFinishedArticles(
  label: string | null | undefined,
  finishedKeys: ReadonlySet<string>,
): boolean {
  const n = normalizeMaterialConflictKey(label);
  if (!n || n.length < 3) return false;
  if (isBaseSubstrateMaterial(label)) return false;
  if (finishedKeys.has(n)) return true;
  for (const key of finishedKeys) {
    if (key.length >= 4 && (n === key || n.startsWith(`${key} `) || key.startsWith(`${n} `))) {
      return true;
    }
  }
  return false;
}

/**
 * Liste blanche Matières : uniquement supports de fabrication
 * (papiers ISF, vinyle/bâche m², plaques brutes…).
 * @param finishedArticleKeys — noms/refs Articles finis normalisés (optionnel)
 */
export function shouldListAsMaterial(opts: {
  label?: string | null;
  family?: string | null;
  finishedArticleKeys?: ReadonlySet<string>;
}): boolean {
  const label = String(opts.label ?? '').trim();
  if (!label) return false;
  if (isNonSubstrateMaterialFamily(opts.family)) return false;
  if (isFinishedProductMisplacedAsMaterial(label)) return false;
  if (opts.finishedArticleKeys?.size && conflictsWithFinishedArticles(label, opts.finishedArticleKeys)) {
    return false;
  }
  if (isBaseSubstrateMaterial(label)) return true;
  // Famille papier / GF / carte : garder si ce n’est pas un service évident
  const fam = String(opts.family ?? '').toLowerCase();
  if (/petit\s*format|grand\s*format|^carte$/i.test(fam)) {
    if (/service|finition|pellicul|reliure|montage|d[eé]coupe|pose\s/i.test(label)) return false;
    // Déclinaisons papier / media souvent sans préfixe strict
    if (
      /\d+\s*g\b|\d+\s*mm\b|ncr|pvc|plex|b[aâ]che|vinyle|couch|bristol|glossy|kraft|offset|mesh|canvas|backlit|forex|dibond/i.test(
        label,
      )
    ) {
      return true;
    }
  }
  return false;
}

/** Catégories DirectSale / Prix articles = SKU commerciaux finis (ids taxonomie). */
export const FINISHED_ARTICLE_CATEGORIES = [
  'plv',
  'textile',
  'goodies',
  'packaging',
  'carterie',
  'flyers',
  'evenementiel',
  'photo',
  'calendrier',
  'notes',
  'documents',
  'conception',
] as const;

/** Catégories à masquer dans Prix articles (supports / services devis). */
export const SUBSTRATE_LIKE_ARTICLE_CATEGORIES = ['impression', 'grand_format', 'finitions'] as const;

function normalizeCatKey(category: string | null | undefined): string {
  return String(category ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Résout id taxonomie même si la DB stocke le libellé FR (« PLV & Chevalets »). */
export function resolveArticleCategoryId(opts: {
  category?: string | null;
  name?: string | null;
  reference?: string | null;
}): string {
  return normalizeDirectSaleCategory({
    category: opts.category,
    name: opts.name,
    reference: opts.reference,
  }).categoryId;
}

export function isFinishedArticleCategory(category: string | null | undefined): boolean {
  const c = normalizeCatKey(category);
  if (!c) return false;
  // Libellés FR → via resolve si besoin
  const id = resolveArticleCategoryId({ category });
  if ((SUBSTRATE_LIKE_ARTICLE_CATEGORIES as readonly string[]).includes(id)) return false;
  if ((FINISHED_ARTICLE_CATEGORIES as readonly string[]).includes(id)) return true;
  if (c === 'cartes' || c === 'petit_format' || c === 'grand_format_std') return true;
  // Libellés affichés en DB
  if (
    /plv|textile|goodies|packaging|carterie|flyer|evenement|photo|calendrier|bloc[\s-]?note|document|conception/i.test(
      c,
    )
  ) {
    return true;
  }
  return false;
}

export function isSubstrateLikeArticleCategory(category: string | null | undefined): boolean {
  const id = resolveArticleCategoryId({ category });
  if ((SUBSTRATE_LIKE_ARTICLE_CATEGORIES as readonly string[]).includes(id)) return true;
  const c = normalizeCatKey(category);
  return (
    c === 'impression'
    || c === 'grand_format'
    || c === 'finitions'
    || /impression\s+sans\s+finition|grand\s+format\s*&\s*pvc|finitions\s*&\s*reliures/i.test(c)
  );
}

/**
 * Prix articles / Catalogue POS : SKU finis uniquement.
 * Ne pas se fier à ART-xxx (tous les imports 2026 l’ont).
 */
export function shouldShowInPrixArticles(row: {
  name?: string | null;
  category?: string | null;
  excelId?: string | null;
  reference?: string | null;
  status?: string | null;
}): boolean {
  if (row.status === 'archived') return false;
  const name = String(row.name ?? '').trim();
  if (!name) return false;

  // Services devis purs — jamais dans Prix articles (quelle que soit la catégorie DB)
  if (
    /^(pelliculage|plastification|reliure|rainage|perforation|couture|piq[uû]re|dos\s+carr[eé]|collage\s+format|montage\s+complet|d[eé]coupe\s+photo|pose\s+autocollant|finition\s+papier)/i.test(
      name,
    )
  ) {
    return false;
  }

  // Support brut seul (PCB 300g, bâche 440g…) → Matières
  if (isBaseSubstrateMaterial(name) && !FINISHED_PRODUCT_AS_MATERIAL_RE.test(name)) {
    return false;
  }

  const categoryId = resolveArticleCategoryId({
    category: row.category,
    name,
    reference: row.excelId ?? row.reference,
  });

  // Finitions / reliures devis → hors Prix articles (sauf SKU commerciaux)
  if (categoryId === 'finitions') {
    if (FINISHED_PRODUCT_AS_MATERIAL_RE.test(name)) return true;
    if (/carnet|facture|souche|badge|bracelet|photocall|porte[\s-]?badge|hang[\s-]?tag/i.test(name)) {
      return true;
    }
    // Services devis (pelliculage, reliure…) → Formules / devis, pas prix article POS
    return false;
  }

  // « Impression sans finition » : garder en-têtes / docs, pas les supports A4 bruts
  if (categoryId === 'impression') {
    if (/en[\s-]?t[eê]te|document|administratif/i.test(name)) return true;
    return FINISHED_PRODUCT_AS_MATERIAL_RE.test(name);
  }

  // Grand format : plaques / produits imprimés OK ; media brut → Matières
  if (categoryId === 'grand_format') {
    if (/imprim/i.test(name) || FINISHED_PRODUCT_AS_MATERIAL_RE.test(name)) return true;
    if (isBaseSubstrateMaterial(name)) return false;
    return /plaque|panneau|kak[eé]|banni[eè]re/i.test(name);
  }

  if ((FINISHED_ARTICLE_CATEGORIES as readonly string[]).includes(categoryId as (typeof FINISHED_ARTICLE_CATEGORIES)[number])) {
    return true;
  }

  // Catégories FR legacy (Bloc-note, Calendriers…)
  if (isFinishedArticleCategory(row.category)) return true;

  return FINISHED_PRODUCT_AS_MATERIAL_RE.test(name);
}
