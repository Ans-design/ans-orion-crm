import { prisma } from '@/lib/prisma';
import { CATALOGUE, CAT_LABELS } from '@/lib/data/catalogue';
import { getProductConfig, type ConfigSection } from '@/lib/data/config-types';
import { BASE_SYNC_RULES, BASE_CORE_RULES, BASE_FORMULAS } from '@/lib/data/base-rules';
import {
  buildFormulaExpression,
  extractRulesFromConfig,
} from '@/lib/regles-catalog';

let syncInProgress: Promise<{ formulas: number; rules: number; articles: number; baseRules?: number; baseFormulas?: number }> | null = null;

async function seedBaseRulesAndFormulas(userId?: string) {
  let rulesCreated = 0;
  let formulasCreated = 0;

  for (const rule of [...BASE_SYNC_RULES, ...BASE_CORE_RULES]) {
    await prisma.businessRule.upsert({
      where: { ruleKey: rule.ruleKey },
      create: {
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
        source: 'base-rules-seed',
        createdBy: userId,
      },
      update: {
        ruleName: rule.ruleName,
        ruleType: rule.ruleType,
        condition: rule.condition,
        action: rule.action,
        message: rule.message,
        priority: rule.priority,
        connected: true,
        source: 'base-rules-seed',
        updatedBy: userId,
        version: { increment: 1 },
      },
    });
    rulesCreated++;
  }

  for (const f of BASE_FORMULAS) {
    await prisma.priceFormula.upsert({
      where: { formulaKey: f.formulaKey },
      create: {
        family: f.family,
        articleId: f.articleId,
        formulaKey: f.formulaKey,
        label: f.label,
        expression: f.expression,
        variables: f.variables,
        examples: f.examples || {},
        source: 'base-rules-seed',
        createdBy: userId,
      },
      update: {
        family: f.family,
        label: f.label,
        expression: f.expression,
        variables: f.variables,
        examples: f.examples || {},
        source: 'base-rules-seed',
        updatedBy: userId,
        version: { increment: 1 },
      },
    });
    formulasCreated++;
  }

  return { rulesCreated, formulasCreated };
}

export async function syncReglesFromCatalogue(userId?: string) {
  if (syncInProgress) return syncInProgress;
  syncInProgress = doSyncReglesFromCatalogue(userId).finally(() => { syncInProgress = null; });
  return syncInProgress;
}

async function doSyncReglesFromCatalogue(userId?: string) {
  let formulasCreated = 0;
  let rulesCreated = 0;

  const baseSeed = await seedBaseRulesAndFormulas(userId);
  formulasCreated += baseSeed.formulasCreated;
  rulesCreated += baseSeed.rulesCreated;

  for (const article of CATALOGUE) {
    const cfg = getProductConfig(article.id, article.configType);
    if (!cfg) continue;

    const family = CAT_LABELS[article.category] || article.category;
    const formulaKey = `formula-${article.id}`;

    const variables = {
      qty: 'Quantité officielle',
      priceTiers: cfg.priceTiers || [],
      prixBase: cfg.prixBase || article.prixDepart,
      prixM2: cfg.prixM2 || null,
      prixCm2: cfg.prixCm2 || null,
      face: 'Recto / Recto-Verso (×1.8)',
      finitions: 'Majoration +12% par finition',
      clicheFee: cfg.hasCliche ? 'Frais cliché (une fois)' : null,
      prix_force: 'Prix unitaire forcé (droit admin)',
    };

    await prisma.priceFormula.upsert({
      where: { formulaKey },
      create: {
        family,
        articleId: article.id,
        formulaKey,
        label: `Formule — ${article.name}`,
        expression: buildFormulaExpression(article.id, cfg),
        variables,
        examples: { qty: cfg.qtyDefault || 100, standard: 'Configuration par défaut' },
        source: 'catalogue-sync',
        createdBy: userId,
      },
      update: {
        family,
        label: `Formule — ${article.name}`,
        expression: buildFormulaExpression(article.id, cfg),
        variables,
        source: 'catalogue-sync',
        updatedBy: userId,
        version: { increment: 1 },
      },
    });
    formulasCreated++;

    const sections: ConfigSection[] = cfg.sections ?? [];
    const rules = extractRulesFromConfig(article.id, family, sections);
    for (const rule of rules) {
      await prisma.businessRule.upsert({
        where: { ruleKey: rule.ruleKey },
        create: {
          ...rule,
          source: 'catalogue-sync',
          createdBy: userId,
        },
        update: {
          ruleName: rule.ruleName,
          ruleType: rule.ruleType,
          condition: rule.condition,
          action: rule.action,
          message: rule.message,
          connected: rule.connected,
          source: 'catalogue-sync',
          updatedBy: userId,
          version: { increment: 1 },
        },
      });
      rulesCreated++;
    }
  }

  return { formulas: formulasCreated, rules: rulesCreated, articles: CATALOGUE.length, baseRules: baseSeed.rulesCreated, baseFormulas: baseSeed.formulasCreated };
}
