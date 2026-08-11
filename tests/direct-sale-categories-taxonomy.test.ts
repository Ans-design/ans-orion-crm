import { describe, expect, it } from 'vitest';
import {
  normalizeDirectSaleCategory,
  DIRECT_SALE_CATEGORY_ALIASES,
} from '@/lib/direct-sale/categories';
import { normalizeCategoryId } from '@/lib/pos/article-category-taxonomy';

describe('DirectSale categories ↔ taxonomie POS', () => {
  it('mappe les anciens ids vers la taxonomie officielle', () => {
    expect(DIRECT_SALE_CATEGORY_ALIASES.grand_format_std).toBe('plv');
    expect(DIRECT_SALE_CATEGORY_ALIASES.cartes).toBe('carterie');
    expect(DIRECT_SALE_CATEGORY_ALIASES.petit_format).toBe('flyers');
    expect(DIRECT_SALE_CATEGORY_ALIASES.design).toBe('conception');
  });

  it('Roll-up / X-Banner ne restent pas en Grand Format', () => {
    expect(
      normalizeDirectSaleCategory({
        category: 'Grand format standard',
        name: 'Roll up standard 200x80 cm',
        reference: 'AVD008',
      }).categoryId,
    ).toBe('plv');
    expect(
      normalizeDirectSaleCategory({
        category: 'grand_format_std',
        name: 'X-Banner 180x80 cm',
        reference: 'AVD011',
      }).categoryId,
    ).toBe('plv');
  });

  it('Bâche reste Grand Format', () => {
    expect(
      normalizeDirectSaleCategory({
        category: 'Grand format standard',
        name: 'Bâche',
        reference: 'gf-bache',
      }).categoryId,
    ).toBe('grand_format');
  });

  it('alias familyToCategoryId grand_format_std → plv', () => {
    expect(normalizeCategoryId('grand_format_std')).toBe('plv');
    expect(normalizeCategoryId('Grand format standard')).toBe('plv');
  });
});
