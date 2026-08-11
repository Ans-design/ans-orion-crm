import type { ConfigField } from '@/lib/data/config-types';
import {
  FLYER_FORBIDDEN_MATIERE_PATTERNS,
  FLYER_MATIERES,
  FLYER_MAX_GRAMMAGE_G,
  FLYER_WEIGHTS_BY_MATIERE,
  isFlyerForbiddenMatiereLabel,
} from '@/lib/data/flyer-material-catalog';
import { isFlyerArticleId } from '@/lib/pos/flyer-catalog';
import { parentFieldForGrammage } from '@/lib/pos/grammage-field';
import { parsePaperGrammageG } from '@/lib/pos/thick-paper-grammage-policy';
import { getRuntimeMaterialRules } from '@/lib/pos/runtime-material-rules';

function flyerMaxGrammageG(): number {
  return getRuntimeMaterialRules().maxFlyerG;
}

export function filterFlyerMatiereOptions(articleId: string, options: string[], category?: string): string[] {
  if (!isFlyerArticleId(articleId, category)) return options;
  const allowed = new Set(FLYER_MATIERES.map((m) => m.toLowerCase()));
  return options.filter(
    (o) => allowed.has(o.toLowerCase()) && !isFlyerForbiddenMatiereLabel(o),
  );
}

export function isFlyerGrammageTooHeavy(grammage: string): boolean {
  const g = parsePaperGrammageG(grammage);
  if (g == null) return false;
  return g > flyerMaxGrammageG();
}

export function filterFlyerGrammageOptions(
  articleId: string,
  options: string[],
  category?: string,
): string[] {
  if (!isFlyerArticleId(articleId, category)) return options;
  return options.filter((opt) => {
    const g = parsePaperGrammageG(opt);
    if (g == null) return true;
    return g <= flyerMaxGrammageG();
  });
}

/** Grammages flyer depuis config-types (ignore le catalogue stock carte ≥ 350 g). */
export function resolveFlyerGrammageOptions(
  field: ConfigField,
  config: Record<string, unknown>,
  articleId: string,
  category?: string,
): string[] {
  if (!isFlyerArticleId(articleId, category)) return field.options ?? [];

  const parentKey = field.optionsFilter?.field ?? parentFieldForGrammage(field.key);
  const matVal = String(config[parentKey] ?? '').trim();
  const fromCatalog =
    FLYER_WEIGHTS_BY_MATIERE[matVal]
    ?? field.optionsFilter?.optionsByValue?.[matVal]
    ?? [];

  return filterFlyerGrammageOptions(articleId, fromCatalog, category);
}

export function applyFlyerMaterialRules(
  articleId: string,
  config: Record<string, unknown>,
  category?: string,
): Record<string, unknown> {
  if (!isFlyerArticleId(articleId, category)) return config;

  let next = { ...config };
  const matiere = String(next.matiere ?? '').trim();
  const grammage = String(next.grammage ?? '').trim();

  if (matiere) {
    const allowed = FLYER_MATIERES.some((m) => m.toLowerCase() === matiere.toLowerCase());
    if (!allowed || isFlyerForbiddenMatiereLabel(matiere)) {
      next.matiere = '';
      next.grammage = '';
    }
  }

  if (isFlyerGrammageTooHeavy(grammage)) {
    next.grammage = '';
  }

  return next;
}

export {
  FLYER_MATIERES,
  FLYER_MAX_GRAMMAGE_G,
  FLYER_FORBIDDEN_MATIERE_PATTERNS,
  isFlyerArticleId,
};
