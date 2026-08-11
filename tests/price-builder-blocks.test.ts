import { describe, expect, it } from 'vitest';
import {
  blocksToExpression,
  blocksToNaturalLanguage,
  createBlock,
  defaultPieceBlocks,
  validatePriceBlocks,
} from '@/lib/pricing/price-builder-blocks';
import { validateDiscountTiers } from '@/lib/pricing/validate-discount-tiers';

describe('visual price builder blocks', () => {
  it('builds natural language and expression for default piece pipeline', () => {
    const blocks = defaultPieceBlocks();
    const nl = blocksToNaturalLanguage(blocks);
    expect(nl).toMatch(/paliers/i);
    expect(nl).toMatch(/arrondi/i);
    const expr = blocksToExpression(blocks);
    expect(expr).toContain('tier(qty');
    expect(expr).toContain('round_up');
  });

  it('rejects blocks without a base', () => {
    const err = validatePriceBlocks([
      createBlock('margin_percent', { value: 20 }),
      createBlock('round_ar', { value: 50 }),
    ]);
    expect(err).toMatch(/base/i);
  });

  it('accepts valid margin blocks with base tier', () => {
    const err = validatePriceBlocks([
      createBlock('base_tier'),
      createBlock('margin_percent', { value: 25 }),
      createBlock('round_ar', { value: 50 }),
    ]);
    expect(err).toBeNull();
  });
});

describe('tier editor validation (phase 5)', () => {
  it('blocks overlapping quantity ranges', () => {
    const err = validateDiscountTiers([
      { minQty: 1, maxQty: 50, unitPrice: 1000, discountPercent: 0, active: true },
      { minQty: 40, maxQty: 100, unitPrice: 900, discountPercent: 0, active: true },
    ]);
    expect(err).toMatch(/Chevauchement/);
  });

  it('allows contiguous non-overlapping tiers', () => {
    const err = validateDiscountTiers([
      { minQty: 1, maxQty: 9, unitPrice: 1000, discountPercent: 0, active: true },
      { minQty: 10, maxQty: 49, unitPrice: 900, discountPercent: 5, active: true },
    ]);
    expect(err).toBeNull();
  });
});
