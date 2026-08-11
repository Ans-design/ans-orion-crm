import { describe, expect, it } from 'vitest';
import { POS_CATALOGUE } from '@/lib/data/catalogue-meta';
import {
  CATEGORY_PREVIEW_FALLBACKS,
  PRODUCT_PREVIEW_COUNT,
  getProductPreviewConfig,
} from '@/lib/data/product-preview-config';
import { resolveProductPreview } from '@/lib/data/product-preview-resolver';
import { resolveMockupKind } from '@/lib/data/mockup-resolver';

describe('product preview engine', () => {
  it('registers all POS catalogue articles', () => {
    expect(PRODUCT_PREVIEW_COUNT).toBe(POS_CATALOGUE.length);
  });

  it('has category fallbacks for every POS category', () => {
    const cats = new Set(POS_CATALOGUE.map((a) => a.category));
    for (const cat of cats) {
      expect(CATEGORY_PREVIEW_FALLBACKS[cat], `fallback for ${cat}`).toBeTruthy();
    }
  });

  it('uses specific mockup for mug not bottle', () => {
    const mug = resolveProductPreview('gd-mug', 'goodies');
    const bottle = resolveProductPreview('gd-gourde', 'goodies');
    expect(mug.previewType).toBe('mug');
    expect(bottle.previewType).toBe('bottle');
    expect(mug.previewType).not.toBe(bottle.previewType);
  });

  it('uses studio asset for recognizable products', () => {
    const cap = resolveProductPreview('tx-casquette', 'textile');
    expect(cap.assetPath).toBe('/assets/products/studio/cap.svg');
    expect(cap.previewType).toBe('cap');
  });

  it('prefers studio asset over inline mockup for flyer', () => {
    const preview = resolveProductPreview('fly-std', 'flyers');
    expect(preview.assetPath).toBe('/assets/products/studio/flyer.svg');
  });

  it('uses category fallback asset for flat kinds', () => {
    const cfg = getProductPreviewConfig('fly-std');
    expect(cfg?.categoryFallbackAsset).toBe(CATEGORY_PREVIEW_FALLBACKS.flyers);
  });

  it('applies recto-verso badge from config', () => {
    const preview = resolveProductPreview('cv-std', 'carterie', { face: 'Recto-verso' });
    expect(preview.showRectoVersoBadge).toBe(true);
  });

  it('applies admin asset override', () => {
    const preview = resolveProductPreview('gd-mug', 'goodies', undefined, {
      articleId: 'gd-mug',
      assetPath: '/assets/products/mugs/custom.png',
    });
    expect(preview.assetPath).toBe('/assets/products/mugs/custom.png');
    expect(preview.source).toBe('article');
  });

  it('major articles avoid flat preview type', () => {
    const ids = ['gd-mug', 'gd-gourde', 'cv-std', 'plv-rollup', 'gf-bache', 'tx-tshirt', 'pkg-boite'];
    for (const id of ids) {
      const item = POS_CATALOGUE.find((a) => a.id === id);
      if (!item) continue;
      const kind = resolveMockupKind(id, item.category);
      expect(kind, id).not.toBe('flat');
      expect(resolveProductPreview(id, item.category).previewType).toBe(kind);
    }
  });
});
