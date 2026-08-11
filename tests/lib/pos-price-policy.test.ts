import { describe, expect, it } from 'vitest';
import {
  articleHasDedicatedPricingEngine,
  isArticleSellable,
  isStrictPosPricing,
  resolvePosPriceConfigured,
  resolvePosPriceMode,
  posPriceModeLabel,
} from '@/lib/pos/pos-price-policy';

describe('pos-price-policy', () => {
  it('detects dedicated GF engine family', () => {
    expect(articleHasDedicatedPricingEngine('gf-vinyl-blanc')).toBe(true);
  });

  it('blocks dedicated GF without published pricing signals', () => {
    const state = resolvePosPriceConfigured({
      articleId: 'gf-vinyl-blanc',
      status: 'draft',
      prixBase: null,
      active: true,
    });
    expect(state.configured).toBe(false);
    expect(state.reason).toMatch(/non publié/i);
  });

  it('allows dedicated GF with published m² price', () => {
    const state = resolvePosPriceConfigured({
      articleId: 'gf-vinyl-blanc',
      status: 'published',
      prixBase: null,
      prixM2: 15000,
      active: true,
    });
    expect(state.configured).toBe(true);
  });

  it('allows dedicated GF with material prices', () => {
    expect(isArticleSellable({
      articleId: 'gf-vinyl-blanc',
      status: 'published',
      prixBase: null,
      active: true,
      hasMaterialPrices: true,
    })).toBe(true);
  });

  it('blocks standard article without published base price', () => {
    // SKU hors catalogue → pas de moteur dédié ; profil brouillon sans prix = non configuré.
    const state = resolvePosPriceConfigured({
      articleId: 'sku-generic-no-engine',
      status: 'draft',
      prixBase: null,
      active: true,
    });
    expect(articleHasDedicatedPricingEngine('sku-generic-no-engine')).toBe(false);
    expect(state.configured).toBe(false);
    expect(state.reason).toMatch(/non publié|absent|configurer/i);
  });

  it('allows carterie dedicated engine without profile prixBase', () => {
    expect(articleHasDedicatedPricingEngine('cv-std')).toBe(true);
    expect(isArticleSellable({
      articleId: 'cv-std',
      status: 'draft',
      prixBase: null,
      active: true,
    })).toBe(true);
  });

  it('allows flyer dedicated engine', () => {
    expect(articleHasDedicatedPricingEngine('fly-std')).toBe(true);
  });

  it('allows published standard article with base price', () => {
    const state = resolvePosPriceConfigured({
      articleId: 'pkg-doypack',
      status: 'published',
      prixBase: 1500,
      active: true,
    });
    expect(state.configured).toBe(true);
  });

  it('allows published article with m2 price only', () => {
    expect(isArticleSellable({
      articleId: 'affiche-m2',
      status: 'published',
      prixBase: null,
      prixM2: 12000,
      active: true,
    })).toBe(true);
  });

  it('allows published article with discount tiers only', () => {
    expect(isArticleSellable({
      articleId: 'flyer-tier',
      status: 'published',
      prixBase: null,
      active: true,
      hasDiscountTiers: true,
    })).toBe(true);
  });

  it('requires published formula for formula calculation type', () => {
    expect(isArticleSellable({
      articleId: 'formule-x',
      status: 'published',
      prixBase: null,
      active: true,
      calculationType: 'formula',
      hasPublishedFormula: false,
    })).toBe(false);
    expect(isArticleSellable({
      articleId: 'formule-x',
      status: 'published',
      prixBase: null,
      active: true,
      calculationType: 'formula',
      hasPublishedFormula: true,
    })).toBe(true);
  });

  it('enables strict pricing for CI env', () => {
    const prevApp = process.env.APP_ENV;
    const prevStrict = process.env.STRICT_POS_PRICING;
    process.env.APP_ENV = 'ci';
    process.env.STRICT_POS_PRICING = '1';
    expect(isStrictPosPricing()).toBe(true);
    process.env.APP_ENV = prevApp;
    process.env.STRICT_POS_PRICING = prevStrict;
  });

  it('resolves direct sale unit price as direct mode', () => {
    expect(resolvePosPriceMode(undefined, { directSaleUnitPrice: 35000 })).toBe('direct');
  });

  it('resolves unconfigured article as to_configure or quote_required', () => {
    const mode = resolvePosPriceMode({
      articleId: 'sku-generic-no-engine',
      status: 'draft',
      prixBase: null,
      active: true,
    });
    expect(['to_configure', 'quote_required']).toContain(mode);
    expect(posPriceModeLabel(mode)).toBeTruthy();
  });

  it('resolves published formula article as calculated', () => {
    expect(resolvePosPriceMode({
      articleId: 'formule-x',
      status: 'published',
      prixBase: null,
      active: true,
      calculationType: 'formula',
      hasPublishedFormula: true,
    })).toBe('calculated');
  });
});
