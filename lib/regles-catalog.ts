/**
 * Catalogue règles/formules — source HTML (base ok.html) sans base de données.
 * Fallback quand Prisma n'est pas disponible (client obsolète en dev).
 */
import { CATALOGUE, CAT_LABELS } from '@/lib/data/catalogue';
import { getProductConfig, type ConfigSection } from '@/lib/data/config-types';
import { BASE_SYNC_RULES, BASE_CORE_RULES, BASE_FORMULAS } from '@/lib/data/base-rules';

export type CatalogRule = {
  id: string;
  family: string;
  articleId: string | null;
  ruleKey: string;
  ruleName: string;
  ruleType: string;
  condition: object;
  action: object;
  message: string | null;
  priority: number;
  active: boolean;
  connected: boolean;
  source: string;
};

export type CatalogFormula = {
  id: string;
  family: string;
  articleId: string;
  formulaKey: string;
  label: string;
  expression: string;
  variables: object;
  examples: object;
  active: boolean;
  source: string;
};

export function buildFormulaExpression(articleId: string, cfg: NonNullable<ReturnType<typeof getProductConfig>>) {
  if (articleId.startsWith('fin-')) {
    switch (articleId) {
      case 'fin-plastification':
        return 'unit = prixBase × formatFactor(dim) → total = unit × qty (2 faces incluses, pas de ×1.8)';
      case 'fin-reliure':
        return 'unit = bindingCatalog(type, pages, grammage, printMode) × (1 − remiseQty) → total = unit × qty';
      case 'fin-coins':
        return 'unit = prixBase × formatFactor × nbCoinsSelectionnes → total = unit × qty';
      case 'fin-autocollant':
        return 'petit: unit×qty | grand: surfaceM² × prixM² × coefHauteur × qty';
      case 'fin-rainage':
        return 'unit = prixBase × nbPlis → total = unit × qty';
      case 'fin-dorure':
      case 'fin-pelliculage':
      case 'fin-vernis':
        return 'unit = prixBase × formatFactor(dim) × faceCoef → total = unit × qty';
      default:
        return 'unit = prixBase × qty (options personnalisées → prix forcé)';
    }
  }
  const parts = ['base = tier(qty, priceTiers)'];
  if (cfg.prixM2) parts.push('unit = prixM2 × surface_m2');
  else if (cfg.prixCm2) parts.push('unit = prixCm2 × surface_cm2');
  else parts.push('unit = tier(qty, priceTiers) || prixBase');
  parts.push('if face == "Recto-Verso" then unit × 1.8');
  parts.push('if finitions then unit × (1 + 0.12 × count(finitions))');
  parts.push('totalHT = unit × qty + clicheFee (once)');
  parts.push('if prix_force then unit = prix_force');
  return parts.join(' → ');
}

export function extractRulesFromConfig(
  articleId: string,
  family: string,
  sections: ConfigSection[],
): Omit<CatalogRule, 'id' | 'source'>[] {
  const rules: Omit<CatalogRule, 'id' | 'source'>[] = [];

  for (const section of sections) {
    for (const field of section.fields) {
      if (field.forcePriceValues?.length) {
        rules.push({
          ruleKey: `${articleId}-${field.key}-force-price`,
          ruleName: `Prix forcé — ${field.label}`,
          ruleType: 'force_price',
          family,
          articleId,
          condition: { field: field.key, values: field.forcePriceValues },
          action: { requireForcedPrice: true, requireReason: true },
          message: `Sélection « personnalisée » sur ${field.label} → prix forcé obligatoire`,
          priority: 100,
          active: true,
          connected: true,
        });
      }
      if (field.optionsFilter) {
        rules.push({
          ruleKey: `${articleId}-${field.key}-filter`,
          ruleName: `Filtre options — ${field.label}`,
          ruleType: 'filter',
          family,
          articleId,
          condition: { filterField: field.optionsFilter.field, targetField: field.key },
          action: { optionsByValue: field.optionsFilter.optionsByValue },
          message: `Options de ${field.label} filtrées par ${field.optionsFilter.field}`,
          priority: 100,
          active: true,
          connected: true,
        });
      }
      if (field.paletteFilter) {
        rules.push({
          ruleKey: `${articleId}-${field.key}-palette`,
          ruleName: `Palette couleur — ${field.label}`,
          ruleType: 'compatibility',
          family,
          articleId,
          condition: { filterField: field.paletteFilter.field, targetField: field.key },
          action: { palettes: Object.keys(field.paletteFilter.palettes) },
          message: `Palette couleur filtrée par ${field.paletteFilter.field}`,
          priority: 100,
          active: true,
          connected: true,
        });
      }
      if (field.compatibility) {
        rules.push({
          ruleKey: `${articleId}-${field.key}-compat`,
          ruleName: `Compatibilité — ${field.label}`,
          ruleType: 'compatibility',
          family,
          articleId,
          condition: { field: field.key },
          action: { matrix: field.compatibility },
          message: `Matrice de compatibilité pour ${field.label}`,
          priority: 100,
          active: true,
          connected: true,
        });
      }
      if (field.showWhen) {
        rules.push({
          ruleKey: `${articleId}-${field.key}-show`,
          ruleName: `Affichage conditionnel — ${field.label}`,
          ruleType: 'validation',
          family,
          articleId,
          condition: { showWhen: field.showWhen },
          action: { visible: true },
          message: `Visible si ${field.showWhen.field} ∈ [${field.showWhen.values.join(', ')}]`,
          priority: 100,
          active: true,
          connected: true,
        });
      }
    }
  }

  const cfg = getProductConfig(articleId);
  if (cfg?.qtyMin) {
    rules.push({
      ruleKey: `${articleId}-qty-min`,
      ruleName: 'Quantité minimale',
      ruleType: 'qty',
      family,
      articleId,
      condition: { min: cfg.qtyMin },
      action: { blockBelowMin: true },
      message: `Quantité minimale : ${cfg.qtyMin}`,
      priority: 100,
      active: true,
      connected: true,
    });
  }

  return rules;
}

export function buildCatalogueSnapshot(): { rules: CatalogRule[]; formulas: CatalogFormula[] } {
  const rules: CatalogRule[] = [];
  const formulas: CatalogFormula[] = [];

  for (const rule of [...BASE_SYNC_RULES, ...BASE_CORE_RULES]) {
    rules.push({
      id: `cat-${rule.ruleKey}`,
      family: rule.family,
      articleId: rule.articleId || null,
      ruleKey: rule.ruleKey,
      ruleName: rule.ruleName,
      ruleType: rule.ruleType,
      condition: rule.condition,
      action: rule.action,
      message: rule.message,
      priority: rule.priority,
      active: true,
      connected: true,
      source: 'html-base-rules',
    });
  }

  for (const f of BASE_FORMULAS) {
    formulas.push({
      id: `cat-${f.formulaKey}`,
      family: f.family,
      articleId: f.articleId,
      formulaKey: f.formulaKey,
      label: f.label,
      expression: f.expression,
      variables: f.variables,
      examples: f.examples || {},
      active: true,
      source: 'html-base-rules',
    });
  }

  for (const article of CATALOGUE) {
    const cfg = getProductConfig(article.id, article.configType);
    if (!cfg) continue;

    const family = CAT_LABELS[article.category] || article.category;
    const formulaKey = `formula-${article.id}`;

    formulas.push({
      id: `cat-${formulaKey}`,
      family,
      articleId: article.id,
      formulaKey,
      label: `Formule — ${article.name}`,
      expression: buildFormulaExpression(article.id, cfg),
      variables: {
        qty: 'Quantité officielle',
        priceTiers: cfg.priceTiers || [],
        prixBase: cfg.prixBase || article.prixDepart,
        face: 'Recto / Recto-Verso (×1.8)',
        finitions: 'Majoration +12% par finition',
      },
      examples: { qty: cfg.qtyDefault || 100 },
      active: true,
      source: 'html-catalogue',
    });

    for (const r of extractRulesFromConfig(article.id, family, cfg.sections ?? [])) {
      rules.push({ ...r, id: `cat-${r.ruleKey}`, source: 'html-catalogue' });
    }
  }

  rules.sort((a, b) => a.priority - b.priority || a.ruleName.localeCompare(b.ruleName));
  formulas.sort((a, b) => a.label.localeCompare(b.label));

  return { rules, formulas };
}

export function filterCatalogRules(
  rules: CatalogRule[],
  opts: { search?: string; family?: string; ruleType?: string; articleId?: string }
): CatalogRule[] {
  let list = rules;
  if (opts.family) list = list.filter((r) => r.family === opts.family);
  if (opts.ruleType) list = list.filter((r) => r.ruleType === opts.ruleType);
  if (opts.articleId) list = list.filter((r) => r.articleId === opts.articleId);
  if (opts.search) {
    const q = opts.search.toLowerCase();
    list = list.filter(
      (r) =>
        r.ruleName.toLowerCase().includes(q) ||
        r.ruleKey.toLowerCase().includes(q) ||
        (r.message || '').toLowerCase().includes(q)
    );
  }
  return list;
}

export function filterCatalogFormulas(
  formulas: CatalogFormula[],
  opts: { search?: string; family?: string; articleId?: string }
): CatalogFormula[] {
  let list = formulas;
  if (opts.family) list = list.filter((f) => f.family === opts.family);
  if (opts.articleId) list = list.filter((f) => f.articleId === opts.articleId);
  if (opts.search) {
    const q = opts.search.toLowerCase();
    list = list.filter(
      (f) =>
        f.label.toLowerCase().includes(q) ||
        f.formulaKey.toLowerCase().includes(q) ||
        f.expression.toLowerCase().includes(q)
    );
  }
  return list;
}

export function computeRuleStats(rules: CatalogRule[]) {
  const typeCounts: Record<string, number> = {};
  rules.forEach((r) => { typeCounts[r.ruleType] = (typeCounts[r.ruleType] || 0) + 1; });
  return {
    total: rules.length,
    byType: Object.entries(typeCounts).map(([ruleType, _count]) => ({ ruleType, _count })),
    connected: rules.filter((r) => r.connected && r.active).length,
    disconnected: rules.filter((r) => !r.connected).length,
  };
}

export function isPrismaReglesReady(client: unknown): boolean {
  const c = client as {
    businessRule?: { findMany?: unknown };
    priceFormula?: { findMany?: unknown };
    articlePricingProfile?: { findMany?: unknown };
  };
  return (
    typeof c?.businessRule?.findMany === 'function' &&
    typeof c?.priceFormula?.findMany === 'function' &&
    typeof c?.articlePricingProfile?.findMany === 'function'
  );
}
