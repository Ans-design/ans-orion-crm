import { describe, expect, it } from 'vitest';
import { getProductConfig } from '@/lib/data/config-types';
import {
  extractStockRules,
  extractUrgencyRules,
  extractOptionGroups,
  inferCalculationType,
} from '@/lib/pricing/config-to-dynamic-pricing';
import { resolveProductionSurcharge } from '@/lib/pricing/production-pricing';
import { evaluateStockConsumption } from '@/lib/pricing/stock-rule-engine';

describe('extractStockRules', () => {
  it('génère consommation cm² pour packaging', () => {
    const cfg = getProductConfig('pkg-boite')!;
    const groups = extractOptionGroups('pkg-boite', cfg.sections);
    const rules = extractStockRules('pkg-boite', inferCalculationType('pkg-boite', cfg), groups);
    expect(rules.some((r) => r.ruleType === 'surface_consumption')).toBe(true);
    expect(rules.find((r) => r.ruleType === 'surface_consumption')?.condition).toMatchObject({ unit: 'cm2' });
  });

  it('génère consommation m² pour grand format', () => {
    const cfg = getProductConfig('gf-vinyl-blanc')!;
    const groups = extractOptionGroups('gf-vinyl-blanc', cfg.sections);
    const rules = extractStockRules('gf-vinyl-blanc', inferCalculationType('gf-vinyl-blanc', cfg), groups);
    expect(rules[0]?.ruleType).toBe('surface_consumption');
    expect((rules[0]?.condition as { unit?: string }).unit).toBe('m2');
  });

  it('ajoute material_key pour champs matière', () => {
    const cfg = getProductConfig('fly-a4')!;
    const groups = extractOptionGroups('fly-a4', cfg.sections);
    const rules = extractStockRules('fly-a4', inferCalculationType('fly-a4', cfg), groups);
    expect(rules.some((r) => r.ruleType === 'material_key' && r.optionFieldKey === 'matiere')).toBe(true);
  });
});

describe('resolveProductionSurcharge', () => {
  it('applique les règles urgence DB', () => {
    const rules = extractUrgencyRules().map((r, i) => ({
      id: `u${i}`,
      articleId: 'fly-a4',
      label: r.label,
      surchargePercent: r.surchargePercent,
      requiresValidation: r.requiresValidation,
      sortOrder: r.sortOrder,
      active: true,
      source: 'test',
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const express = resolveProductionSurcharge('Express 48 h', rules);
    expect(express.source).toBe('urgencyRule');
    expect(express.multiplier).toBeCloseTo(1.3, 1);

    const standard = resolveProductionSurcharge('Standard atelier', rules);
    expect(standard.multiplier).toBe(1);
  });
});

describe('evaluateStockConsumption', () => {
  it('retourne pièces pour article piece', () => {
    const result = evaluateStockConsumption(
      'pkg-hangtag',
      { qty: 50, matiere: 'PCB', grammage: '300g' },
      50,
      [{ id: '1', articleId: 'pkg-hangtag', optionFieldKey: null, ruleType: 'piece_consumption', condition: {}, action: {}, active: true, source: null, createdAt: new Date(), updatedAt: new Date() }],
      'piece',
    );
    expect(result.unit).toBe('piece');
    expect(result.amount).toBe(50);
    expect(result.materialKey).toBe('PCB');
  });
});
