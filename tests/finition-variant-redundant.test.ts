import { describe, expect, it } from 'vitest';
import {
  mergeVariantCardsIntoMainArticle,
  resolveFinitionVariantCanonical,
  isRedundantFinitionVariantCard,
  FIN_RELIURE_ID,
  FIN_COLLAGE_ID,
  FIN_PLASTIFICATION_ID,
  FIN_PELLICULAGE_ID,
  IMP_IMPRESSION_ID,
  GF_PHOTO_ID,
} from '@/lib/pos/finition-variant-redundant';

describe('finition-variant-redundant', () => {
  it('maps PVC opaque/translucide → Impression sans finition', () => {
    expect(resolveFinitionVariantCanonical('PVC opaque', 'GF009')?.canonicalId).toBe(IMP_IMPRESSION_ID);
    expect(resolveFinitionVariantCanonical('PVC translucide', 'GF008')?.canonicalId).toBe(IMP_IMPRESSION_ID);
    expect(resolveFinitionVariantCanonical('PVC opaque', 'GF009')?.prefill?.matiere).toBe('PVC opaque');
  });

  it('maps Photo grand format → gf-photo', () => {
    expect(resolveFinitionVariantCanonical('Photo grand format', 'GF011')?.canonicalId).toBe(GF_PHOTO_ID);
  });

  it('maps spirales by diameter → Reliure spirale', () => {
    const t = resolveFinitionVariantCanonical(
      'Spirale plastique/métallique — 6 mm / 1/4″',
      '6 mm / 1/4″',
      'Reliure',
    );
    expect(t?.canonicalId).toBe(FIN_RELIURE_ID);
    expect(t?.optionLabel).toMatch(/6 mm/);
  });

  it('maps collage A4/A3 → Collage', () => {
    expect(
      resolveFinitionVariantCanonical('Collage format A4 — A4', 'A4', 'Collage')?.canonicalId,
    ).toBe(FIN_COLLAGE_ID);
    expect(
      resolveFinitionVariantCanonical('Collage format A3 — A3', 'A3', 'Collage')?.canonicalId,
    ).toBe(FIN_COLLAGE_ID);
  });

  it('maps plastification A5/A6 → Plastification', () => {
    expect(
      resolveFinitionVariantCanonical('Plastification — A5', 'A5', 'Plastification')?.canonicalId,
    ).toBe(FIN_PLASTIFICATION_ID);
    expect(
      resolveFinitionVariantCanonical('Plastification — A6', 'A6', 'Plastification')?.canonicalId,
    ).toBe(FIN_PLASTIFICATION_ID);
  });

  it('maps pelliculage formats → Pelliculage', () => {
    expect(
      resolveFinitionVariantCanonical('Pelliculage recto-verso — A6/A5/A4', 'A6/A5/A4', 'Pelliculage')
        ?.canonicalId,
    ).toBe(FIN_PELLICULAGE_ID);
  });

  it('does not flag canonical fin-* as redundant', () => {
    expect(isRedundantFinitionVariantCard('Reliure spirale', 'fin-reliure')).toBe(false);
    expect(isRedundantFinitionVariantCard('Plastification', 'fin-plastification')).toBe(false);
    expect(isRedundantFinitionVariantCard('Impression sans finition', 'imp-impression')).toBe(false);
  });

  it('mergeVariantCardsIntoMainArticle aggregates known variants', () => {
    const merged = mergeVariantCardsIntoMainArticle([
      { articleId: 'GF009', name: 'PVC opaque', priceAr: 5000 },
      { articleId: 'GF008', name: 'PVC translucide', priceAr: 5000 },
      { articleId: 'GF011', name: 'Photo grand format' },
      { articleId: '6 mm / 1/4″', name: 'Spirale plastique/métallique — 6 mm / 1/4″', category: 'Reliure', priceAr: 3000 },
      { articleId: 'A4', name: 'Collage format A4 — A4', category: 'Collage', priceAr: 500 },
      { articleId: 'A5', name: 'Plastification — A5', category: 'Plastification', priceAr: 1200 },
      { articleId: 'fin-reliure', name: 'Reliure spirale' },
    ]);
    expect(merged.map((m) => m.articleId)).not.toContain('fin-reliure');
    expect(merged.find((m) => m.articleId === 'GF009')?.target.canonicalId).toBe(IMP_IMPRESSION_ID);
    expect(merged.find((m) => m.articleId === '6 mm / 1/4″')?.target.canonicalId).toBe(FIN_RELIURE_ID);
    expect(merged.find((m) => m.articleId === 'A4')?.target.canonicalId).toBe(FIN_COLLAGE_ID);
    expect(merged.find((m) => m.articleId === 'A5')?.target.canonicalId).toBe(FIN_PLASTIFICATION_ID);
    expect(merged.find((m) => m.articleId === 'GF011')?.target.canonicalId).toBe(GF_PHOTO_ID);
  });
});
