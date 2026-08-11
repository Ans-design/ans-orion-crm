import { describe, expect, it } from 'vitest';
import { applyPromotionalRule, pricingResolver } from '@/lib/pricing/pricing-resolver';
import { PRICE_CONTEXTS } from '@/lib/pricing/material-context-price';

describe('architecture fusion Stock & Prix', () => {
  it('expose les contextes prix canoniques', () => {
    expect(PRICE_CONTEXTS).toContain('PRINT_SMALL_FORMAT');
    expect(PRICE_CONTEXTS).toContain('PRINT_GRAND_FORMAT');
    expect(PRICE_CONTEXTS).toContain('RAW_STOCK');
    expect(PRICE_CONTEXTS).toContain('BLANK_MATERIAL');
  });

  it('pricingResolver expose l’API demandée', () => {
    expect(typeof pricingResolver.getMaterialBasePrice).toBe('function');
    expect(typeof pricingResolver.resolveSmallFormatPrice).toBe('function');
    expect(typeof pricingResolver.resolveGrandFormatPrice).toBe('function');
    expect(typeof pricingResolver.resolveDirectSalePrice).toBe('function');
    expect(typeof pricingResolver.resolveHybridArticlePrice).toBe('function');
    expect(typeof pricingResolver.applyQuantityTiers).toBe('function');
    expect(typeof pricingResolver.applyPromotionalRule).toBe('function');
    expect(typeof pricingResolver.validateMaterialFormatCompatibility).toBe('function');
    expect(typeof pricingResolver.calculateFinalPOSPrice).toBe('function');
  });

  it('promo article n’altère pas le prix matière de base (helper)', () => {
    const base = 1500;
    const { price, applied } = applyPromotionalRule(base, 'evt-affiche', 'PCB');
    expect(applied).toBe(true);
    expect(price).toBe(900);
    expect(base).toBe(1500);
  });

  it('valide compatibilité format × matière via resolver', () => {
    const glossyA2 = pricingResolver.validateMaterialFormatCompatibility('Glossy', 'A2');
    expect(glossyA2.allowed).toBe(false);
    const offsetA0 = pricingResolver.validateMaterialFormatCompatibility('Offset', 'A0');
    expect(offsetA0.allowed).toBe(true);
  });
});

describe('pricingDataSyncService API surface', () => {
  it('exporte les fonctions de sync demandées', async () => {
    const svc = await import('@/lib/services/pricing-data-sync.service');
    expect(typeof svc.syncMaterialToSmallFormat).toBe('function');
    expect(typeof svc.syncMaterialToGrandFormat).toBe('function');
    expect(typeof svc.syncMaterialToDirectArticles).toBe('function');
    expect(typeof svc.syncRulesToPOS).toBe('function');
    expect(typeof svc.detectPricingDrift).toBe('function');
    expect(typeof svc.rebuildPOSPriceIndex).toBe('function');
    expect(typeof svc.verifyNoDuplicatePriceSources).toBe('function');
    expect(typeof svc.migratePricingSourcesToCanonical).toBe('function');
    expect(svc.pricingDataSyncService).toBeTruthy();
  });
});
