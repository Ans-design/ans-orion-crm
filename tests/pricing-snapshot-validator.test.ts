import { describe, expect, it } from 'vitest';
import { parsePricingSnapshotEnvelope, pricingSnapshotEnvelopeSchema } from '@/lib/validators/pricing-snapshot';
import { buildPricingSnapshotEnvelope } from '@/lib/pricing/pricing-snapshot-meta';
import type { PriceResult } from '@/lib/pricing/price-types';

describe('pricing snapshot validator', () => {
  it('parse une enveloppe v1 valide', () => {
    const env = parsePricingSnapshotEnvelope({
      version: 1,
      calculatedAt: '2026-07-05T12:00:00.000Z',
      priceSource: 'dynamicDiscountTier',
      formulaVersion: 3,
      formulaExpression: 'prixBase * qty',
      profileStatus: 'published',
      dynamicEngine: true,
      appliedTier: {
        source: 'db_discount',
        label: '10–49',
        minQty: 10,
        maxQty: 49,
        unitPrice: 1200,
      },
      prixUnitaire: 1200,
      totalHT: 12000,
    });
    expect(env?.formulaVersion).toBe(3);
    expect(env?.appliedTier?.label).toBe('10–49');
  });

  it('rejette une enveloppe invalide', () => {
    expect(parsePricingSnapshotEnvelope({ version: 2 })).toBeNull();
    expect(parsePricingSnapshotEnvelope(null)).toBeNull();
  });

  it('buildPricingSnapshotEnvelope produit une enveloppe parseable', () => {
    const result: PriceResult = {
      articleId: 'evt-affiche',
      articleLabel: 'Affiche',
      qty: 10,
      prixUnitaire: 500,
      sousTotal: 5000,
      remiseRate: 0,
      remiseAmount: 0,
      clicheFee: 0,
      totalHT: 5000,
      totalTTC: 6000,
      pricingMode: 'auto',
      snapshot: {
        dynamicEngine: true,
        formulaVersion: 2,
        priceSource: 'dynamicPrixBase',
        appliedTier: {
          source: 'config_tier',
          label: '1–99',
          minQty: 1,
          maxQty: 99,
          unitPrice: 500,
        },
      },
    };
    const env = buildPricingSnapshotEnvelope(result);
    expect(pricingSnapshotEnvelopeSchema.safeParse(env).success).toBe(true);
  });
});
