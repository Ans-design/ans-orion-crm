import {
  DEFAULT_PRINT_TECHNOLOGY_COMPAT_RULES,
  type PrintTechnologyCompatRule,
} from '@/lib/data/print-technology-compat-config';
import { parsePaperGrammageG } from '@/lib/pos/thick-paper-grammage-policy';

export type PrintTechnologyContext = {
  matiere?: string | null;
  grammage?: string | null;
  articleId?: string | null;
};

function norm(s: string | null | undefined): string {
  return String(s ?? '').trim().toLowerCase();
}

function ruleMatches(rule: PrintTechnologyCompatRule, ctx: PrintTechnologyContext): boolean {
  if (!rule.active) return false;
  if (rule.articleId && norm(rule.articleId) !== norm(ctx.articleId)) return false;
  if (rule.matiere && norm(rule.matiere) !== norm(ctx.matiere)) return false;
  if (rule.grammageG != null) {
    const g = parsePaperGrammageG(String(ctx.grammage ?? ''));
    if (g == null || g !== rule.grammageG) return false;
  }
  return true;
}

export function getActivePrintTechnologyRules(
  customRules?: PrintTechnologyCompatRule[],
): PrintTechnologyCompatRule[] {
  const rules = customRules?.length ? customRules : DEFAULT_PRINT_TECHNOLOGY_COMPAT_RULES;
  return rules.filter((r) => r.active);
}

export function isPrintTechnologyAllowed(
  technology: string,
  ctx: PrintTechnologyContext,
  customRules?: PrintTechnologyCompatRule[],
): boolean {
  const tech = String(technology ?? '').trim();
  if (!tech || /autres/i.test(tech)) return true;

  const rules = getActivePrintTechnologyRules(customRules).filter((r) => ruleMatches(r, ctx));
  for (const rule of rules) {
    if (rule.forbiddenTechnologies.some((f) => norm(f) === norm(tech))) return false;
    if (rule.allowedTechnologies?.length) {
      return rule.allowedTechnologies.some((a) => norm(a) === norm(tech));
    }
  }
  return true;
}

export function filterPrintTechnologyOptions(
  options: string[],
  ctx: PrintTechnologyContext,
  customRules?: PrintTechnologyCompatRule[],
): string[] {
  return options.filter((opt) => isPrintTechnologyAllowed(opt, ctx, customRules));
}

export function getPrintTechnologyCompatAlert(
  ctx: PrintTechnologyContext,
  technology: string | null | undefined,
  customRules?: PrintTechnologyCompatRule[],
): string | null {
  const tech = String(technology ?? '').trim();
  if (!tech || isPrintTechnologyAllowed(tech, ctx, customRules)) return null;
  const mat = String(ctx.matiere ?? '').trim() || 'cette matière';
  return `${tech} n'est pas compatible avec ${mat}. Choisissez une autre technologie.`;
}

const TECHNO_KEYS = ['technologie', 'technologie_interieur', 'technologie_couverture'] as const;

/** Réinitialise les technologies incompatibles après changement matière / grammage. */
export function applyPrintTechnologyRules(
  config: Record<string, unknown>,
  articleId?: string | null,
  customRules?: PrintTechnologyCompatRule[],
): Record<string, unknown> {
  let next = { ...config };
  const matiere = String(next.matiere ?? next.famille_papier ?? next.matiere_feuillets ?? '');
  const grammage = String(next.grammage ?? next.grammage_feuillets ?? '');
  const ctx: PrintTechnologyContext = { matiere, grammage, articleId };

  for (const key of TECHNO_KEYS) {
    const val = String(next[key] ?? '');
    if (val && !isPrintTechnologyAllowed(val, ctx, customRules)) {
      next[key] = '';
    }
  }
  return next;
}
