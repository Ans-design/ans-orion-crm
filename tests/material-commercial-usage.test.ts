import { describe, expect, it } from 'vitest';
import {
  commercialUsageToFlags,
  resolveMaterialCommercialUsage,
} from '@/lib/backoffice/material-commercial-usage';

describe('material commercial usage (§12)', () => {
  it('classifies production-only when not POS-visible', () => {
    expect(
      resolveMaterialCommercialUsage({
        active: true,
        visiblePOS: false,
        impactsStock: true,
      }),
    ).toBe('production_only');
  });

  it('classifies used_by_pos_products when visible POS', () => {
    expect(
      resolveMaterialCommercialUsage({
        active: true,
        visiblePOS: true,
        linkedArticlesCount: 2,
      }),
    ).toBe('used_by_pos_products');
  });

  it('classifies sold_direct when blank sell without product links', () => {
    expect(
      resolveMaterialCommercialUsage({
        active: true,
        visiblePOS: true,
        blankSellPrice: 1500,
        linkedArticlesCount: 0,
      }),
    ).toBe('sold_direct');
  });

  it('never treats a material as automatic POS article when unused', () => {
    expect(
      resolveMaterialCommercialUsage({
        active: false,
        visiblePOS: false,
      }),
    ).toBe('unused');
  });

  it('maps usage modes to persistence flags safely', () => {
    expect(commercialUsageToFlags('production_only').visiblePos).toBe(false);
    expect(commercialUsageToFlags('used_by_pos_products').visiblePos).toBe(true);
    expect(commercialUsageToFlags('unused').active).toBe(false);
  });
});
