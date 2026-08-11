import { describe, expect, it } from 'vitest';
import { getProductConfig } from '@/lib/data/config-types';
import { buildArticleDynamicPricingSeed, extractDiscountTiers } from '@/lib/pricing/config-to-dynamic-pricing';
import { computeDynamicUnitPrice } from '@/lib/pricing/dynamic-engine';
import type { DynamicPricingContext } from '@/lib/pricing/dynamic-pricing-context';
import type { Prisma } from '@prisma/client';

function mockContext(articleId: string, overrides?: Partial<DynamicPricingContext>): DynamicPricingContext {
  const cfg = getProductConfig(articleId)!;
  const seed = buildArticleDynamicPricingSeed(articleId, articleId, 'packaging', 'pièce', cfg.prixBase ?? 100, cfg);
  return {
    profile: {
      id: 'p1',
      articleId,
      articleLabel: articleId,
      family: 'packaging',
      calculationType: seed.profile.calculationType,
      saleUnit: 'pièce',
      status: 'published',
      prixBase: seed.profile.prixBase,
      prixM2: seed.profile.prixM2,
      prixCm2: seed.profile.prixCm2 ?? 3,
      qtyMin: seed.profile.qtyMin,
      active: true,
      source: 'test',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    formula: {
      id: 'f1',
      articleId,
      version: 1,
      status: 'published',
      label: 'test',
      expression: seed.formula.expression,
      variables: seed.formula.variables as object,
      pipeline: null,
      publishedAt: new Date(),
      publishedBy: null,
      source: 'test',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    discountTiers: extractDiscountTiers(cfg.priceTiers, cfg.prixBase ?? 100).map((t, i) => ({
      id: `t${i}`,
      articleId,
      minQty: t.minQty,
      maxQty: t.maxQty,
      unitPrice: t.unitPrice,
      discountPercent: t.discountPercent,
      active: true,
      source: 'test',
      variantKey: 'default',
      variantLabel: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    materialPrices: [],
    variables: [],
    optionGroups: seed.optionGroups.map((g, gi) => ({
      id: `g${gi}`,
      articleId,
      fieldKey: g.fieldKey,
      label: g.label,
      sectionTitle: g.sectionTitle,
      sectionIcon: g.sectionIcon,
      fieldType: g.fieldType,
      sortOrder: g.sortOrder,
      visiblePos: g.visiblePos,
      active: g.active,
      required: g.required,
      impactsPrice: g.impactsPrice,
      impactsStock: g.impactsStock,
      impactsProduction: g.impactsProduction,
      isInformational: g.isInformational,
      requiresAdminValidation: g.requiresAdminValidation,
      metadata: (g.metadata ?? null) as object | null,
      source: 'test',
      createdAt: new Date(),
      updatedAt: new Date(),
      values: g.values.map((v, vi) => ({
        id: `v${gi}-${vi}`,
        groupId: `g${gi}`,
        valueKey: v.valueKey,
        label: v.label,
        sortOrder: v.sortOrder,
        priceModifier: v.priceModifier,
        priceAddonAr: v.modifierType === 'multiplier' ? 0 : Math.round(v.priceModifier),
        priceMultiplier: v.modifierType === 'multiplier' ? v.priceModifier : 0,
        modifierType: v.modifierType,
        forcePrice: v.forcePrice,
        active: v.active,
        metadata: (v.metadata ?? null) as object | null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    })),
    urgencyRules: seed.urgencyRules.map((u, i) => ({
      id: `u${i}`,
      articleId,
      label: u.label,
      surchargePercent: u.surchargePercent,
      requiresValidation: u.requiresValidation,
      sortOrder: u.sortOrder,
      active: true,
      source: 'test',
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    stockRules: seed.stockRules.map((s, i) => ({
      id: `s${i}`,
      articleId,
      optionFieldKey: s.optionFieldKey,
      ruleType: s.ruleType,
      condition: s.condition as Prisma.JsonValue,
      action: s.action as Prisma.JsonValue,
      active: true,
      source: 'test',
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    ...overrides,
  };
}

describe('dynamic-engine', () => {
  it('applique les paliers DB pour hangtag qty 100', () => {
    const ctx = mockContext('pkg-hangtag');
    const r = computeDynamicUnitPrice('pkg-hangtag', { qty: 100 }, 100, ctx);
    expect(r.prixUnitaire).toBe(120);
    expect(r.priceSource).toBe('dynamicDiscountTier');
  });

  it('calcule surface cm² pour boîte personnalisée', () => {
    const ctx = mockContext('pkg-boite');
    const r = computeDynamicUnitPrice(
      'pkg-boite',
      {
        format: 'Format personnalisé',
        longueur: 200,
        largeur: 150,
        hauteur: 80,
        structure: 'Caisse à rabats droits',
      },
      10,
      ctx,
    );
    expect(['dynamicCm2Surface', 'dynamicDiscountTier', 'dynamicPrixBase']).toContain(r.priceSource);
    expect(r.prixUnitaire).toBeGreaterThan(0);
  });

  it('applique recto-verso ×1.8', () => {
    const ctx = mockContext('pkg-hangtag');
    const base = computeDynamicUnitPrice('pkg-hangtag', { qty: 50 }, 50, ctx);
    const rv = computeDynamicUnitPrice('pkg-hangtag', { qty: 50, face: 'Recto-Verso' }, 50, ctx);
    expect(rv.prixUnitaire).toBe(Math.round(base.prixUnitaire * 1.8));
  });

  it('sans profil publié le moteur legacy reste actif (tryCompute retourne null)', async () => {
    const { tryComputeDynamicPrice } = await import('@/lib/pricing/dynamic-engine');
    const r = await tryComputeDynamicPrice('__article_inexistant_test__', { qty: 100 }, undefined, null);
    expect(r).toBeNull();
  }, 15000);
});
