import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '@/lib/data/catalogue';
import { getProductConfig } from '@/lib/data/config-types';
import {
  buildArticleDynamicPricingSeed,
  buildFormulaExpression,
  extractDiscountTiers,
  extractGlobalPricingVariables,
  extractOptionGroups,
  inferCalculationType,
  toValueKey,
} from '@/lib/pricing/config-to-dynamic-pricing';

describe('dynamic-pricing seed extraction', () => {
  it('toValueKey normalise les libellés chips', () => {
    expect(toValueKey('Recto-Verso')).toBe('recto-verso');
    expect(toValueKey('Format personnalisé')).toBe('format-personnalise');
  });

  it('inferCalculationType détecte cm², laize et pièce', () => {
    const boite = getProductConfig('pkg-boite');
    expect(boite).not.toBeNull();
    expect(inferCalculationType('pkg-boite', boite!)).toBe('cm2');

    const vinyl = getProductConfig('gf-vinyl-blanc');
    expect(vinyl).not.toBeNull();
    expect(inferCalculationType('gf-vinyl-blanc', vinyl!)).toBe('laize');

    const hangtag = getProductConfig('pkg-hangtag');
    expect(hangtag).not.toBeNull();
    expect(inferCalculationType('pkg-hangtag', hangtag!)).toBe('piece');
  });

  it('extractOptionGroups inclut dimension hangtag avec force prix', () => {
    const cfg = getProductConfig('pkg-hangtag')!;
    const groups = extractOptionGroups('pkg-hangtag', cfg.sections);
    const dimension = groups.find((g) => g.fieldKey === 'dimension');
    expect(dimension).toBeDefined();
    expect(dimension!.impactsPrice).toBe(true);
    expect(dimension!.requiresAdminValidation).toBe(true);
    const custom = dimension!.values.find((v) => v.label === 'Format personnalisé');
    expect(custom?.forcePrice).toBe(true);
  });

  it('extractDiscountTiers convertit priceTiers en minQty', () => {
    const cfg = getProductConfig('pkg-hangtag')!;
    const tiers = extractDiscountTiers(cfg.priceTiers, cfg.prixBase ?? 150);
    expect(tiers[0]).toMatchObject({ minQty: 1, maxQty: 99, unitPrice: 150 });
    expect(tiers[1]).toMatchObject({ minQty: 100, maxQty: 499, unitPrice: 120 });
    expect(tiers[tiers.length - 1].maxQty).toBeNull();
  });

  it('buildFormulaExpression inclut paliers et recto-verso', () => {
    const cfg = getProductConfig('pkg-hangtag')!;
    const expr = buildFormulaExpression('pkg-hangtag', cfg);
    expect(expr).toContain('tier(qty, priceTiers)');
    expect(expr).toContain('Recto-Verso');
  });

  it('extractGlobalPricingVariables expose TVA, production et coeffs face/finition', () => {
    const vars = extractGlobalPricingVariables();
    expect(vars.some((v) => v.code === 'tva_default')).toBe(true);
    expect(vars.some((v) => v.code === 'production_express48h')).toBe(true);
    expect(vars.some((v) => v.code === 'face_recto_verso_mult')).toBe(true);
    expect(vars.some((v) => v.code === 'finition_surcharge_pct')).toBe(true);
  });

  it('buildArticleDynamicPricingSeed couvre tout le catalogue configuré', () => {
    let withConfig = 0;
    let totalGroups = 0;
    let totalStockRules = 0;
    for (const article of CATALOGUE) {
      const cfg = getProductConfig(article.id, article.configType);
      if (!cfg) continue;
      withConfig++;
      const seed = buildArticleDynamicPricingSeed(
        article.id,
        article.name,
        article.category,
        article.unit,
        article.prixDepart,
        cfg,
      );
      expect(seed.profile.articleId).toBe(article.id);
      expect(seed.formula.expression.length).toBeGreaterThan(10);
      expect(seed.stockRules.length).toBeGreaterThan(0);
      totalGroups += seed.optionGroups.length;
      totalStockRules += seed.stockRules.length;
    }
    expect(withConfig).toBeGreaterThan(80);
    expect(totalGroups).toBeGreaterThan(500);
    expect(totalStockRules).toBeGreaterThan(80);
  });
});
