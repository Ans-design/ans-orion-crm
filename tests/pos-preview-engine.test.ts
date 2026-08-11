import { describe, expect, it } from 'vitest';
import { POS_CATALOGUE } from '@/lib/data/catalogue-meta';
import {
  PRODUCT_PREVIEW_REGISTRY,
  PRODUCT_PREVIEW_REGISTRY_COUNT,
} from '@/lib/pos-preview/product-preview.registry';
import { MUG_PRODUCT_IDS } from '@/lib/pos-preview/product-preview.types';
import {
  getOrientation,
  getProductRatio,
  normalizePreviewSize,
} from '@/lib/pos-preview/ratio-utils';
import { resolvePreviewContext } from '@/lib/pos-preview/product-preview-mapper';

describe('pos-preview registry', () => {
  it('couvre les 95 produits POS', () => {
    expect(PRODUCT_PREVIEW_REGISTRY_COUNT).toBe(95);
    expect(POS_CATALOGUE).toHaveLength(95);
    for (const item of POS_CATALOGUE) {
      expect(PRODUCT_PREVIEW_REGISTRY[item.id]).toBeDefined();
      expect(PRODUCT_PREVIEW_REGISTRY[item.id].productName).toBe(item.name);
    }
  });

  it('assigne une famille et un fallback à chaque produit', () => {
    for (const item of POS_CATALOGUE) {
      const entry = PRODUCT_PREVIEW_REGISTRY[item.id];
      expect(entry.family).toBeTruthy();
      expect(entry.fallbackComponent).toBeTruthy();
      expect(entry.previewMode).toBeTruthy();
      expect(entry.orientationMode).toBeTruthy();
    }
  });

  it('n’utilise mockup mug que pour gd-mug', () => {
    for (const item of POS_CATALOGUE) {
      const entry = PRODUCT_PREVIEW_REGISTRY[item.id];
      if (entry.mockupKey === 'mug') {
        expect(MUG_PRODUCT_IDS.has(item.id)).toBe(true);
      }
    }
  });
});

describe('pos-preview ratio-utils', () => {
  it('calcule orientation paysage/portrait/carré', () => {
    expect(getOrientation(300, 100)).toBe('landscape');
    expect(getOrientation(85, 200)).toBe('portrait');
    expect(getOrientation(200, 200)).toBe('square');
  });

  it('normalise les dimensions dans une boîte max', () => {
    const { width, height } = normalizePreviewSize(850, 2000, 220, 260);
    expect(width).toBeLessThanOrEqual(220);
    expect(height).toBeLessThanOrEqual(260);
    expect(getProductRatio(850, 2000)).toBeCloseTo(0.425, 2);
  });
});

describe('pos-preview context', () => {
  it('résout vinyle grand format en portrait avec échelle', () => {
    const ctx = resolvePreviewContext({
      product: { id: 'gf-vinyl-blanc', name: 'Vinyle', category: 'grand_format', icon: '🖼️' },
      selectedOptions: { largeur: 85, hauteur: 200 },
      mode: 'configurator',
    });
    expect(ctx.entry.family).toBe('grand-format-souple');
    expect(ctx.entry.scaleReference).toBe(true);
    expect(ctx.orientation).toBe('portrait');
    expect(ctx.surfaceM2).toBeGreaterThan(0);
  });
});
