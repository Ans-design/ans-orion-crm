import type { ConfigField, ConfigSection, ProductConfig } from '@/lib/data/config-types';
import { sortPOSOptions } from '@/lib/pos/sort-pos-options';
import { isPetitFormatArticle } from '@/lib/dimensions/petit-format-units';
import { isGrandFormatArticleId } from '@/lib/grand-format/article-meta';
import { dedupeFormatOptions } from '@/lib/pos/normalize-format-options';

function isFormatFieldKey(key: string): boolean {
  return /format|dimension|taille|^dim$/i.test(key) && !/grammage/.test(key);
}

/** Grands formats événementiel — conserver les tailles libres en cm. */
const EVT_KEEP_CM_IDS = new Set([
  'evt-photocall',
  'evt-photobooth',
  'evt-affiche',
  'evt-comptoir',
  'evt-cheque',
]);

function shouldKeepCmFormats(articleId?: string, category?: string): boolean {
  if (articleId && EVT_KEEP_CM_IDS.has(articleId)) return true;
  if (category === 'grand_format' || (articleId && isGrandFormatArticleId(articleId))) return true;
  if (!articleId) return false;
  // Petit format : mm ; pas de conversion cm→mm sur chips déjà libres
  return !(isPetitFormatArticle(articleId, category) && !isGrandFormatArticleId(articleId));
}

function normalizeAndDedupeFormats(options: string[], keepCm: boolean): string[] {
  // Petit format : libellés ISO mm sans parenthèse « ≈ … cm » (équiv. gérées en facturation).
  return dedupeFormatOptions(options, { keepCm, withCommercialAlias: false });
}

function sortFieldOptions(field: ConfigField, keepCmFormats: boolean): ConfigField {
  if (!field.options?.length) return field;
  const isFormat = isFormatFieldKey(field.key);
  let options = field.options;
  if (isFormat) {
    options = normalizeAndDedupeFormats(options, keepCmFormats);
  }
  const sorted = sortPOSOptions(field.key, options);
  let optionsFilter = field.optionsFilter;
  if (optionsFilter?.optionsByValue) {
    const next: Record<string, string[]> = {};
    for (const [k, vals] of Object.entries(optionsFilter.optionsByValue)) {
      let v = vals;
      if (isFormat) v = normalizeAndDedupeFormats(v, keepCmFormats);
      next[k] = sortPOSOptions(
        /grammage|poids/i.test(field.key) ? 'grammage' : field.key,
        v,
      );
    }
    optionsFilter = { ...optionsFilter, optionsByValue: next };
  }
  return { ...field, options: sorted, ...(optionsFilter ? { optionsFilter } : {}) };
}

/** Masque sections/champs archivés (`posHidden`) et trie options (format/matière/grammage). */
export function filterProductConfigForPos(
  config: ProductConfig | null,
  ctx?: { articleId?: string; category?: string },
): ProductConfig | null {
  if (!config) return null;
  const articleId = ctx?.articleId;
  const keepCmFormats = shouldKeepCmFormats(articleId, ctx?.category);
  const hideFormatEquivalent =
    articleId === 'pkg-boite'
    || articleId === 'pkg-sac'
    || Boolean(articleId?.startsWith('pkg-') && /boite|sac/i.test(articleId));

  return {
    ...config,
    sections: config.sections
      .filter((section) => !section.posHidden)
      .map((section) => ({
        ...section,
        fields: section.fields
          .filter((field) => {
            if (field.posHidden) return false;
            // Format équivalent packaging : calcul auto (L×P×H) — pas de chips POS
            if (
              hideFormatEquivalent
              && (field.key === 'formatEquivalent'
                || field.key === 'format_eq_longueur'
                || field.key === 'format_eq_largeur')
            ) {
              return false;
            }
            return true;
          })
          .map((field) => sortFieldOptions(field, keepCmFormats)),
      })),
  };
}

export function isPosVisibleSection(section: ConfigSection): boolean {
  return !section.posHidden;
}

export function isPosVisibleField(field: ConfigField): boolean {
  return !field.posHidden;
}
