import { describe, expect, it } from 'vitest';
import { DEFAULT_GLOBAL_PRICING } from '@/lib/data/global-pricing';
import { applyFinitionSurcharge } from '@/lib/pricing/config-normalize';
import {
  mergePricingVariablesIntoGlobalConfig,
  globalConfigToPricingVariableValues,
} from '@/lib/pricing/global-config';
import { pricingVariableSeedUpdateFields } from '@/lib/pricing/sync-dynamic-pricing';
import { extractGlobalPricingVariables } from '@/lib/pricing/config-to-dynamic-pricing';

describe('Lot 3 P0 — variables 100% DB', () => {
  it('seed update payload does not overwrite value or source', () => {
    const update = pricingVariableSeedUpdateFields({
      label: 'TVA par défaut (%)',
      unit: '%',
      valueType: 'number',
      scope: 'global',
      articleId: null,
    });
    expect(update).toEqual({
      label: 'TVA par défaut (%)',
      unit: '%',
      valueType: 'number',
      scope: 'global',
      articleId: null,
      version: { increment: 1 },
    });
    expect(update).not.toHaveProperty('value');
    expect(update).not.toHaveProperty('source');
  });

  it('mergePricingVariablesIntoGlobalConfig: PricingVariable overrides systemConfig layer', () => {
    const base = {
      ...DEFAULT_GLOBAL_PRICING,
      tvaDefault: 20,
      production: { ...DEFAULT_GLOBAL_PRICING.production, express48h: 1.3 },
      bat: { ...DEFAULT_GLOBAL_PRICING.bat, physiquePapier: 15000 },
    };
    const merged = mergePricingVariablesIntoGlobalConfig(base, [
      { code: 'tva_default', value: '18' },
      { code: 'production_express48h', value: '1.5' },
      { code: 'bat_physique_papier', value: '20000' },
      { code: 'livraison_tana', value: '9900' },
      { code: 'inactive_skip', value: '99', active: false },
    ]);
    expect(merged.tvaDefault).toBe(18);
    expect(merged.production.express48h).toBe(1.5);
    expect(merged.production.standard).toBe(DEFAULT_GLOBAL_PRICING.production.standard);
    expect(merged.bat.physiquePapier).toBe(20000);
    expect(merged.livraison.livraisonTana).toBe(9900);
    expect(merged.livraison.livraisonProvince).toBe(DEFAULT_GLOBAL_PRICING.livraison.livraisonProvince);
  });

  it('globalConfigToPricingVariableValues maps all write-through codes', () => {
    const values = globalConfigToPricingVariableValues(DEFAULT_GLOBAL_PRICING);
    expect(values.tva_default).toBe('20');
    expect(values.production_super24h).toBe('1.6');
    expect(values.livraison_province).toBe('35000');
  });

  it('applyFinitionSurcharge accepts custom pct', () => {
    expect(applyFinitionSurcharge(1000, { finitions: ['A', 'B'] })).toBe(1240);
    expect(applyFinitionSurcharge(1000, { finitions: ['A', 'B'] }, undefined, 10)).toBe(1200);
    expect(applyFinitionSurcharge(1000, { finitions: ['A'] }, undefined, 20)).toBe(1200);
  });

  it('extractGlobalPricingVariables seeds face / finition coeffs', () => {
    const vars = extractGlobalPricingVariables();
    const face = vars.find((v) => v.code === 'face_recto_verso_mult');
    const fin = vars.find((v) => v.code === 'finition_surcharge_pct');
    expect(face).toMatchObject({ value: '1.8', unit: '×' });
    expect(fin).toMatchObject({ value: '12', unit: '%' });
  });
});
