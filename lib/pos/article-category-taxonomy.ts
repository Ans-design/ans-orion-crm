/**
 * Taxonomie officielle des catégories POS + validation / suggestion.
 * Source de vérité pour family → categoryId (évite le fallback « finitions »).
 */
import { CATALOGUE, CAT_LABELS, CATEGORIES } from '@/lib/data/catalogue';

/** IDs stables alignés sur CATEGORIES / CAT_LABELS */
export const POS_CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export type PosCategoryId = (typeof POS_CATEGORY_IDS)[number] | string;

export type ArticleCategoryInput = {
  articleId?: string | null;
  name?: string | null;
  family?: string | null;
  category?: string | null;
  configType?: string | null;
};

export type CategoryValidationIssue = {
  code:
    | 'empty_category'
    | 'unknown_category'
    | 'textile_in_finitions'
    | 'carterie_in_finitions'
    | 'flyer_in_finitions'
    | 'goodies_in_finitions'
    | 'event_in_finitions'
    | 'grand_format_mismatch'
    | 'plv_in_grand_format'
    | 'pvc_petit_in_grand_format'
    | 'bache_variant_as_article'
    | 'finition_in_wrong_category'
    | 'finished_product_in_finitions'
    | 'incoherent';
  message: string;
  currentCategoryId: string | null;
  suggestedCategoryId: string;
};

export type CategoryValidationResult = {
  ok: boolean;
  currentCategoryId: string | null;
  suggestedCategoryId: string;
  issues: CategoryValidationIssue[];
  needsReview: boolean;
};

/** Alias famille / libellé → id catégorie POS */
const FAMILY_ALIASES: Record<string, string> = {
  packaging: 'packaging',
  'packaging & boîtes': 'packaging',
  'packaging & boites': 'packaging',
  calendrier: 'calendrier',
  'calendriers & marque-page': 'calendrier',
  notes: 'notes',
  'bloc-note': 'notes',
  'bloc note': 'notes',
  plv: 'plv',
  'plv & chevalets': 'plv',
  'plv / signalétique': 'plv',
  'plv / signaletique': 'plv',
  livres: 'livres',
  'livres, booklets, mémoires': 'livres',
  'livres, booklets, memoires': 'livres',
  carterie: 'carterie',
  cartes: 'carterie',
  carte: 'carterie',
  flyers: 'flyers',
  flyer: 'flyers',
  'impression petit format': 'flyers',
  'petit format': 'flyers',
  petit_format: 'flyers',
  finitions: 'finitions',
  'finitions & reliures': 'finitions',
  'finitions & façonnage': 'finitions',
  'finitions & faconnage': 'finitions',
  reliure: 'finitions',
  pelliculage: 'finitions',
  plastification: 'finitions',
  découpe: 'finitions',
  decoupe: 'finitions',
  façonnage: 'finitions',
  faconnage: 'finitions',
  collage: 'finitions',
  grand_format: 'grand_format',
  'grand format': 'grand_format',
  'grand format & pvc': 'grand_format',
  /** Ancien DirectSale : contenait Roll-up / X-Banner */
  'grand format standard': 'plv',
  grand_format_std: 'plv',
  textile: 'textile',
  textiles: 'textile',
  goodies: 'goodies',
  evenementiel: 'evenementiel',
  événementiel: 'evenementiel',
  photo: 'photo',
  document: 'document',
  'documents administratifs': 'document',
  conception: 'conception',
  'conception graphique': 'conception',
  'design graphique': 'conception',
  'design / conception graphique': 'conception',
  design: 'conception',
  impression: 'impression',
  'impression sans finition': 'impression',
};

/**
 * Mots-clés nom → catégorie.
 * Les opérations de finition sont testées en premier (ex. « Découpe photobooth » reste finitions).
 */
const NAME_RULES: Array<{ categoryId: string; patterns: RegExp[] }> = [
  {
    categoryId: 'finitions',
    patterns: [
      /\breliure\b/i,
      /\bpelliculage\b/i,
      /\bplastification\b/i,
      /\blaminage\b/i,
      /\bd[eé]coupe\b/i,
      /\brainage\b/i,
      /\bpliage\b/i,
      /\bperforation\b/i,
      /\bmicroperforation\b/i,
      /\bcollage\b/i,
      /\bcouture\b/i,
      /\bdorure\b/i,
      /\bargenture\b/i,
      /\bvernis\b/i,
      /\bgaufrage\b/i,
      /\bembossage\b/i,
      /\bd[eé]bossage\b/i,
      /\bcoins?\s+arrondis/i,
      /\bpose\s+(œ|oe)illets/i,
      /\bpose\s+adh[eé]sif/i,
      /\bpose\s+autocollant/i,
      /\bmontage\b/i,
      /\bsoudure\b/i,
      /\bcontre[\s-]?collage/i,
      /\bholographique/i,
      /\bpiq[uû]re\s+[aà]\s+cheval/i,
      /\bagrafage\b/i,
      /\bfa[cç]onnage\b/i,
      /\bspirale\b/i,
      /\bdos\s+carr[eé]\s+coll[eé]/i,
    ],
  },
  {
    categoryId: 'textile',
    patterns: [
      /\bbob\b/i,
      /\bcasquette/i,
      /\bt[\s-]?shirt/i,
      /\bpolo\b/i,
      /\bsweat/i,
      /\bgilet\b/i,
      /\bmaillot\b/i,
      /\btote\s?bag/i,
      /\btotebag/i,
      /\btrousse\b/i,
      /\btextile/i,
      /\bvêtement/i,
      /\bvetement/i,
    ],
  },
  {
    categoryId: 'carterie',
    patterns: [
      /carte\s+de\s+visite/i,
      /carte\s+de\s+fid[eé]lit[eé]/i,
      /carte\s+cadeau/i,
      /carte\s+de\s+v[oœ]ux/i,
      /jeux?\s+de\s+cartes/i,
    ],
  },
  {
    categoryId: 'flyers',
    patterns: [/\bflyers?\b/i, /\bd[eé]pliant/i],
  },
  {
    categoryId: 'goodies',
    patterns: [
      /\bmug\b/i,
      /\bstylo\b/i,
      /porte[\s-]?cl[eé]/i,
      /\bgourde\b/i,
      /\bbriquet\b/i,
      /\bparapluie\b/i,
      /\btapis\s+souris/i,
      /\bgoodie/i,
    ],
  },
  {
    categoryId: 'evenementiel',
    patterns: [
      /\bbillet\b/i,
      /\bbracelet/i,
      /\blanyard/i,
      /\bphotocall/i,
      /\bphotobooth/i,
      /\bfanion\b/i,
      /\bch[eè]que\s+cadeau/i,
      /\benveloppe\b/i,
      /\bbadge\b/i,
      /\bcomptoir/i,
    ],
  },
  {
    categoryId: 'plv',
    patterns: [
      /\broll[\s-]?up/i,
      /\bx[\s-]?banner/i,
      /(?<!couture\s)\boriflamme\b/i,
      /\bstop[\s-]?trottoir/i,
      /\bstop\s*&\s*totem/i,
      /\bchevalets?\b/i,
      /porte[\s-]?flyers/i,
      /porte[\s-]?affiches/i,
      /\bpresentoir/i,
      /\bpr[eé]sentoir/i,
    ],
  },
  {
    categoryId: 'impression',
    patterns: [
      /\bpvc\s+opaque\b/i,
      /\bpvc\s+translucide\b/i,
      /\bpvc\s+transparent\b/i,
      /carte\s+pvc/i,
      /impression\s+sans\s+finition/i,
    ],
  },
  {
    categoryId: 'grand_format',
    patterns: [
      /\bb[aâ]che\b/i,
      /\bvinyle?\b/i,
      /\bdos\s+bleu/i,
      /\bone[\s-]?way/i,
      /\bpvc\s+rigide/i,
      /\bpvc\s+\d+\s*mm/i,
      /\bplexiglass?/i,
      /\bacrylic/i,
      /\bacrylique/i,
      /\btoile\s+canvas/i,
      /\btissu\s+drapeau/i,
      /\btissu\s+polyester/i,
      /\bfrosted/i,
      /\bfilm\s+sabl[eé]/i,
      /\br[eé]fl[eé]chissant/i,
      /\bpp\s+film/i,
      /\bind[eé]chirable/i,
      /\bpapier\s+photo\s+gf/i,
      /\bpanneau\b/i,
    ],
  },
  {
    categoryId: 'photo',
    patterns: [/\btirage\s+photo/i, /\bphotobook/i, /\bcadre\s+photo/i, /\bphoto\s+grand\s+format/i],
  },
  {
    categoryId: 'conception',
    patterns: [/\blogo\b/i, /charte\s+graphique/i, /motion\s+design/i, /conception\s+graphique/i],
  },
  {
    categoryId: 'document',
    patterns: [/carnet\s+autocopiant/i, /\btampon\b/i, /facturier/i],
  },
  {
    categoryId: 'calendrier',
    patterns: [/\bcalendrier\b/i, /marque[\s-]?page/i],
  },
  {
    categoryId: 'notes',
    patterns: [/bloc[\s-]?notes?/i],
  },
  {
    categoryId: 'livres',
    patterns: [/\blivre\b/i, /\bbooklet\b/i, /\bm[eé]moire/i, /\bbrochure\b/i],
  },
  {
    categoryId: 'packaging',
    patterns: [/\bbo[iî]te\b/i, /\bhangtag\b/i, /\bdoypack\b/i, /\bsac\s+papier/i, /[eé]tiquette/i],
  },
];

const FINITION_CONFIG_TYPES = new Set([
  'finition',
  'reliure',
  'pelliculage',
  'plastification',
  'decoupe',
  'faconnage',
]);

function normKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/** Résout un libellé / id famille vers un id catégorie POS, ou null si inconnu. */
export function normalizeCategoryId(familyOrCategory: string | null | undefined): string | null {
  if (!familyOrCategory?.trim()) return null;
  const raw = familyOrCategory.trim();
  if (CAT_LABELS[raw]) return raw;
  const byLabel = Object.entries(CAT_LABELS).find(([, label]) => label === raw);
  if (byLabel) return byLabel[0];
  const alias = FAMILY_ALIASES[normKey(raw)];
  if (alias) return alias;
  return null;
}

/** Libellé officiel pour un id catégorie. */
export function categoryLabel(categoryId: string): string {
  return CAT_LABELS[categoryId] ?? categoryId;
}

function suggestFromName(name: string | null | undefined): string | null {
  if (!name?.trim()) return null;
  // Garde-fou : couture oriflammes = finition, pas PLV
  if (/couture/i.test(name) && /oriflamme/i.test(name)) return 'finitions';
  for (const rule of NAME_RULES) {
    if (rule.patterns.some((re) => re.test(name))) return rule.categoryId;
  }
  return null;
}

function suggestFromCatalogueId(articleId: string | null | undefined): string | null {
  if (!articleId?.trim()) return null;
  const hit = CATALOGUE.find((a) => a.id === articleId);
  if (hit) return hit.category;
  // Préfixe catalogue (tx-, cv-, fly-, fin-, …)
  const prefixMap: Record<string, string> = {
    tx: 'textile',
    cv: 'carterie',
    fly: 'flyers',
    fin: 'finitions',
    gf: 'grand_format',
    pkg: 'packaging',
    plv: 'plv',
    cal: 'calendrier',
    note: 'notes',
    liv: 'livres',
    goo: 'goodies',
    evt: 'evenementiel',
    ev: 'evenementiel',
    ph: 'photo',
    photo: 'photo',
    doc: 'document',
    cg: 'conception',
    imp: 'impression',
  };
  const dash = articleId.indexOf('-');
  if (dash > 0) {
    const prefix = articleId.slice(0, dash).toLowerCase();
    if (prefixMap[prefix]) return prefixMap[prefix];
  }
  if (/^AVD0(21|22)$/i.test(articleId)) return 'textile';
  if (/^AVD0(12|13|14)$/i.test(articleId)) return 'carterie';
  if (/^AVD0(16|17|18)$/i.test(articleId)) return 'flyers';
  if (/^AVD0(08|09|10|11)$/i.test(articleId)) return 'plv';
  if (/^AVD004$/i.test(articleId)) return 'plv';
  if (/^GF0(13|14)$/i.test(articleId)) return 'plv';
  if (/^GF0(08|09)$/i.test(articleId)) return 'impression';
  if (/^GF011$/i.test(articleId)) return 'photo';
  return null;
}

/**
 * Suggère la catégorie POS correcte pour un article.
 * Priorité : catalogue statique → heuristique nom → famille normalisée → impression.
 */
export function suggestCorrectCategory(article: ArticleCategoryInput): string {
  const fromId = suggestFromCatalogueId(article.articleId);
  if (fromId) return fromId;

  const fromName = suggestFromName(article.name);
  if (fromName) return fromName;

  const fromFamily = normalizeCategoryId(article.family ?? article.category);
  if (fromFamily) return fromFamily;

  if (article.configType && FINITION_CONFIG_TYPES.has(article.configType)) {
    return 'finitions';
  }

  return 'impression';
}

/**
 * Mappe family DB → id catégorie POS.
 * Priorité : identité article (id/nom) > famille normalisée — évite Roll-up restant en Grand Format
 * parce que la famille DB dit encore « Grand Format & PVC ».
 */
export function familyToCategoryId(family: string | null | undefined, hint?: ArticleCategoryInput): string {
  if (hint?.articleId || hint?.name) {
    const fromId = suggestFromCatalogueId(hint.articleId);
    if (fromId) return fromId;
    const fromName = suggestFromName(hint.name);
    if (fromName) return fromName;
  }
  const normalized = normalizeCategoryId(family ?? hint?.family ?? hint?.category);
  if (normalized) return normalized;
  return suggestCorrectCategory({ ...hint, family: family ?? hint?.family });
}

/** Détecte si le nom correspond à une opération de finition/façonnage uniquement. */
export function looksLikeFinishingOnly(name: string | null | undefined): boolean {
  if (!name?.trim()) return false;
  const finRule = NAME_RULES.find((r) => r.categoryId === 'finitions');
  if (!finRule) return false;
  if (!finRule.patterns.some((re) => re.test(name))) return false;
  // Exclure produits finis qui mentionnent une finition dans le libellé
  const finished = suggestFromName(name);
  return !finished || finished === 'finitions';
}

export function validateArticleCategory(article: ArticleCategoryInput): CategoryValidationResult {
  const suggested = suggestCorrectCategory(article);
  const currentRaw = article.category ?? article.family ?? null;
  const current = normalizeCategoryId(currentRaw) ?? (currentRaw?.trim() ? currentRaw.trim() : null);
  const issues: CategoryValidationIssue[] = [];

  if (!currentRaw?.trim()) {
    issues.push({
      code: 'empty_category',
      message: 'Catégorie / famille vide',
      currentCategoryId: null,
      suggestedCategoryId: suggested,
    });
  } else if (!normalizeCategoryId(currentRaw)) {
    issues.push({
      code: 'unknown_category',
      message: `Catégorie non reconnue : « ${currentRaw} » → suggéré ${categoryLabel(suggested)}`,
      currentCategoryId: current,
      suggestedCategoryId: suggested,
    });
  }

  const effective = current && CAT_LABELS[current] ? current : null;

  if (effective === 'finitions' && suggested !== 'finitions') {
    const codeMap: Record<string, CategoryValidationIssue['code']> = {
      textile: 'textile_in_finitions',
      carterie: 'carterie_in_finitions',
      flyers: 'flyer_in_finitions',
      goodies: 'goodies_in_finitions',
      evenementiel: 'event_in_finitions',
      grand_format: 'grand_format_mismatch',
    };
    issues.push({
      code: codeMap[suggested] ?? 'finished_product_in_finitions',
      message: `${article.name || article.articleId || 'Article'} est dans Finitions & Reliures, catégorie suggérée : ${categoryLabel(suggested)}`,
      currentCategoryId: 'finitions',
      suggestedCategoryId: suggested,
    });
  }

  if (suggested === 'finitions' && effective && effective !== 'finitions') {
    issues.push({
      code: 'finition_in_wrong_category',
      message: `Finition classée dans ${categoryLabel(effective)}, suggéré : Finitions & Reliures`,
      currentCategoryId: effective,
      suggestedCategoryId: 'finitions',
    });
  }

  if (effective === 'grand_format' && suggested === 'plv') {
    issues.push({
      code: 'plv_in_grand_format',
      message: `${article.name || article.articleId || 'Article'} est dans Grand Format & PVC, catégorie suggérée : PLV & Chevalets`,
      currentCategoryId: 'grand_format',
      suggestedCategoryId: 'plv',
    });
  }

  if (effective === 'grand_format' && suggested === 'impression') {
    issues.push({
      code: 'pvc_petit_in_grand_format',
      message: `${article.name || article.articleId || 'Article'} (PVC/support petit format) est dans Grand Format, suggéré : Impression sans finition`,
      currentCategoryId: 'grand_format',
      suggestedCategoryId: 'impression',
    });
  }

  if (suggested === 'grand_format' && effective && effective !== 'grand_format' && effective !== 'plv') {
    issues.push({
      code: 'grand_format_mismatch',
      message: `Article grand format mal catégorisé (${categoryLabel(effective)})`,
      currentCategoryId: effective,
      suggestedCategoryId: 'grand_format',
    });
  }

  if (effective && suggested !== effective && !issues.some((i) => i.suggestedCategoryId === suggested)) {
    issues.push({
      code: 'incoherent',
      message: `Catégorie incohérente : ${categoryLabel(effective)} → ${categoryLabel(suggested)}`,
      currentCategoryId: effective,
      suggestedCategoryId: suggested,
    });
  }

  const ok = issues.length === 0;
  return {
    ok,
    currentCategoryId: effective,
    suggestedCategoryId: suggested,
    issues,
    needsReview: !ok,
  };
}

/** Famille canonique à persister en DB (libellé officiel). */
export function canonicalFamilyLabel(categoryId: string): string {
  return CAT_LABELS[categoryId] ?? categoryId;
}
