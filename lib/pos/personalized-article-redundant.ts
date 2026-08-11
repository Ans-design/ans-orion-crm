/**
 * Doublons « X personnalisé » / variantes DirectSale → article métier unique.
 * Règle : tous les articles ANS sont personnalisables — pas de 2e carte POS.
 */
import { CATALOGUE } from '@/lib/data/catalogue';

export type PersonalizedMergeTarget = {
  canonicalId: string;
  /** Prefill configurateur (grammage, format…) */
  prefill?: Record<string, string>;
  /** Libellé option technique à assurer sur le canonique */
  techniqueLabel?: string;
};

/** SKUs DirectSale → article catalogue principal */
export const PERSONALIZED_DS_TO_CANONICAL: Record<string, PersonalizedMergeTarget> = {
  AVD019: { canonicalId: 'tx-tshirt', prefill: { grammage: '170g' }, techniqueLabel: 'Impression' },
  AVD020: { canonicalId: 'tx-polo', prefill: { grammage: '220g' }, techniqueLabel: 'Impression' },
  AVD021: { canonicalId: 'tx-casquette', techniqueLabel: 'Broderie / Impression' },
  AVD022: { canonicalId: 'tx-bob', techniqueLabel: 'Broderie / Impression' },
  AVD023: { canonicalId: 'tx-trousse', techniqueLabel: 'Impression' },
  AVD024: { canonicalId: 'gd-mug', techniqueLabel: 'Sublimation' },
  AVD025: { canonicalId: 'tx-totebag', prefill: { format: 'A3' }, techniqueLabel: 'Impression' },
  AVD026: { canonicalId: 'gd-stylo', techniqueLabel: 'Impression / Gravure' },
  AVD027: { canonicalId: 'gd-pins', techniqueLabel: 'Personnalisation' },
  AVD028: { canonicalId: 'gd-gourde', techniqueLabel: 'Impression' },
  AVD029: { canonicalId: 'tx-sweat', techniqueLabel: 'Impression' },
  AVD002: { canonicalId: 'pkg-gobelet', techniqueLabel: 'Impression' },
};

/** Noms officiels catalogue qui contiennent déjà « personnalisé » = article principal, pas doublon */
const OFFICIAL_PERSONALIZED_IDS = new Set(
  CATALOGUE.filter((a) => /personnalis/i.test(a.name)).map((a) => a.id),
);

/** Racine métier → id catalogue */
const BASE_NAME_TO_CANONICAL: Array<{ re: RegExp; canonicalId: string; prefill?: Record<string, string> }> = [
  { re: /^t[\s-]?shirts?\b/i, canonicalId: 'tx-tshirt' },
  { re: /^polos?\b/i, canonicalId: 'tx-polo' },
  { re: /^sweats?\b/i, canonicalId: 'tx-sweat' },
  { re: /^casquettes?\b/i, canonicalId: 'tx-casquette' },
  { re: /^bobs?\b/i, canonicalId: 'tx-bob' },
  { re: /^trousses?\b/i, canonicalId: 'tx-trousse' },
  { re: /^tote[\s-]?bags?\b/i, canonicalId: 'tx-totebag' },
  { re: /^totebags?\b/i, canonicalId: 'tx-totebag' },
  { re: /^maillots?\b/i, canonicalId: 'tx-maillot' },
  { re: /^gilets?\b/i, canonicalId: 'tx-gilet' },
  { re: /^combinaisons?\b/i, canonicalId: 'tx-combinaison' },
  { re: /^mugs?\b/i, canonicalId: 'gd-mug' },
  { re: /^gourdes?\b/i, canonicalId: 'gd-gourde' },
  { re: /^stylos?\b/i, canonicalId: 'gd-stylo' },
  { re: /^pins?\b/i, canonicalId: 'gd-pins' },
  { re: /^pin'?s\b/i, canonicalId: 'gd-pins' },
];

export function isOfficialPersonalizedArticle(
  articleId: string | null | undefined,
  name?: string | null,
): boolean {
  const id = (articleId ?? '').trim();
  if (OFFICIAL_PERSONALIZED_IDS.has(id)) return true;
  // Canoniques catalogue sans « personnalisé » dans le nom = jamais doublon
  if (CATALOGUE.some((a) => a.id === id && !/personnalis/i.test(a.name))) return false;
  return false;
}

export function resolvePersonalizedCanonical(
  name: string | null | undefined,
  articleId?: string | null,
): PersonalizedMergeTarget | null {
  const id = (articleId ?? '').trim();
  if (PERSONALIZED_DS_TO_CANONICAL[id]) return PERSONALIZED_DS_TO_CANONICAL[id];
  if (isOfficialPersonalizedArticle(id, name)) return null;
  // Ne pas fusionner le canonique sur lui-même
  if (CATALOGUE.some((a) => a.id === id)) {
    const cat = CATALOGUE.find((a) => a.id === id)!;
    if (!/personnalis/i.test(cat.name) || OFFICIAL_PERSONALIZED_IDS.has(id)) return null;
  }

  const n = (name ?? '').trim();
  if (!n || !/personnalis/i.test(n)) return null;

  // « Polo personnalisé 220g » → grammage
  const grammage = n.match(/(\d+)\s*g\b/i)?.[1];
  const formatA3 = /\bA3\b/i.test(n);

  for (const rule of BASE_NAME_TO_CANONICAL) {
    if (!rule.re.test(n)) continue;
    if (id === rule.canonicalId) return null;
    const prefill: Record<string, string> = { ...(rule.prefill ?? {}) };
    if (grammage) prefill.grammage = `${grammage}g`;
    if (formatA3) prefill.format = 'A3';
    return { canonicalId: rule.canonicalId, prefill: Object.keys(prefill).length ? prefill : undefined };
  }
  return null;
}

export function isRedundantPersonalizedArticle(
  name: string | null | undefined,
  articleId?: string | null,
): boolean {
  const id = (articleId ?? '').trim();
  if (PERSONALIZED_DS_TO_CANONICAL[id]) return true;
  if (isOfficialPersonalizedArticle(id, name)) return false;
  if (CATALOGUE.some((a) => a.id === id && !/personnalis/i.test(a.name))) return false;
  const target = resolvePersonalizedCanonical(name, articleId);
  return Boolean(target && target.canonicalId !== id);
}

export const REDUNDANT_PERSONALIZED_IDS = Object.keys(PERSONALIZED_DS_TO_CANONICAL);

export function personalizedLegacyPrefill(articleId: string): Record<string, string> | null {
  return PERSONALIZED_DS_TO_CANONICAL[articleId]?.prefill ?? null;
}

export function resolvePersonalizedCanonicalId(articleId: string): string {
  return PERSONALIZED_DS_TO_CANONICAL[articleId]?.canonicalId ?? articleId;
}
