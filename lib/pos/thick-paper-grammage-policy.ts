import { isGrammageFieldKey } from '@/lib/pos/grammage-field';
import { isCarteArticleId } from '@/lib/pos/carte-material-rules';
import { getRuntimeMaterialRules } from '@/lib/pos/runtime-material-rules';

/** Grammage minimum papier épais (cartes, calendriers rigides, couvertures…). */
export const THICK_PAPER_MIN_GRAMMAGE_G = 230;

/** Carte fidélité — tamponnage : plus strict que le standard carte. */
export const FIDELITE_MIN_GRAMMAGE_G = 250;

function thickPaperMinG(): number {
  return getRuntimeMaterialRules().minCarteG;
}

function fideliteMinG(): number {
  return getRuntimeMaterialRules().minFideliteG;
}

/** Articles papier épais obligatoire sur le grammage principal (hors intérieur léger). */
export const THICK_PAPER_ARTICLE_IDS = new Set([
  'cv-std',
  'cv-fidelite',
  'cv-jeux',
  'cal-marquepage',
  'cal-chevalet',
  'cal-chevalet-table',
  'bn-bloc-note',
  'bn-a4',
  'bn-a5',
  'bn-a6',
  'bn-b5',
  'bn-agenda',
  'pkg-hangtag',
]);

/** Champs grammage intérieur — papier léger autorisé (livres, blocs). */
const INTERIOR_GRAMMAGE_KEYS = new Set([
  'grammage_interieur',
  'grammage_int',
]);

/** Couvertures & supports rigides — minimum 230g. */
const COVER_GRAMMAGE_KEYS = new Set([
  'grammage_couverture',
  'grammage_couv',
]);

const SKIP_MIN_PATTERN = /mm|micron|µ|sur devis|standard|rigide luxe|400g socle/i;

/** Extrait un grammage en g (ignore mm, PVC, libellés non numériques). */
export function parsePaperGrammageG(value: string): number | null {
  const v = value.trim();
  if (!v || SKIP_MIN_PATTERN.test(v)) return null;
  if (/personnalis|autres/i.test(v) && !/\d/.test(v)) return null;
  const m = v.match(/(\d+)/);
  if (!m) return null;
  const g = parseInt(m[1], 10);
  return g > 0 ? g : null;
}

export function isFideliteArticleId(articleId: string): boolean {
  return articleId === 'cv-fidelite' || articleId === 'carte_fidelite';
}

/**
 * Grammage minimum applicable, ou null si aucune contrainte.
 */
export function getMinGrammageG(
  articleId: string,
  grammageKey: string,
  _category?: string,
): number | null {
  if (!isGrammageFieldKey(grammageKey)) return null;
  if (INTERIOR_GRAMMAGE_KEYS.has(grammageKey)) return null;

  if (isFideliteArticleId(articleId) && grammageKey === 'grammage') {
    return fideliteMinG();
  }

  if (COVER_GRAMMAGE_KEYS.has(grammageKey)) {
    return thickPaperMinG();
  }

  if (THICK_PAPER_ARTICLE_IDS.has(articleId)) {
    return thickPaperMinG();
  }

  if (isCarteArticleId(articleId) && grammageKey === 'grammage') {
    return thickPaperMinG();
  }

  return null;
}

export function isGrammageBelowMinimum(
  articleId: string,
  grammage: string,
  grammageKey: string,
  category?: string,
): boolean {
  const min = getMinGrammageG(articleId, grammageKey, category);
  if (min == null) return false;
  const g = parsePaperGrammageG(grammage);
  if (g == null) return false;
  return g < min;
}

export function filterThickPaperGrammageOptions(
  articleId: string,
  options: string[],
  grammageKey: string,
  category?: string,
): string[] {
  const min = getMinGrammageG(articleId, grammageKey, category);
  if (min == null) return options;
  return options.filter((opt) => {
    const g = parsePaperGrammageG(opt);
    if (g == null) return true;
    return g >= min;
  });
}

export function getMinGrammageHint(
  articleId: string,
  grammageKey: string,
  category?: string,
): string {
  const min = getMinGrammageG(articleId, grammageKey, category);
  if (min == null) return '';
  if (isFideliteArticleId(articleId) && grammageKey === 'grammage') {
    return `Grammage minimum ${min}g pour carte fidélité (tamponnage)`;
  }
  return `Grammage minimum ${min}g — support papier épais requis`;
}

/** Réinitialise les grammages trop légers après changement matière / article. */
export function applyThickPaperGrammageRules(
  articleId: string,
  config: Record<string, unknown>,
  category?: string,
): Record<string, unknown> {
  const next = { ...config };
  for (const key of Object.keys(next)) {
    if (!isGrammageFieldKey(key)) continue;
    const val = String(next[key] ?? '').trim();
    if (val && isGrammageBelowMinimum(articleId, val, key, category)) {
      next[key] = '';
    }
  }
  return next;
}
