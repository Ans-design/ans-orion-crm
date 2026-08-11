import { describe, expect, it } from 'vitest';
import {
  analyzeTiers,
  buildPublishChecklist,
  productSheetTabForSection,
  resolveProductSheetTab,
  PRODUCT_SHEET_TABS_VISIBLE,
} from '@/lib/administration/product-sheet';

describe('product-sheet tabs', () => {
  it('expose exactly 3 visible fiche tabs (options / sim / historique hors fiche)', () => {
    expect(PRODUCT_SHEET_TABS_VISIBLE.map((t) => t.id)).toEqual([
      'general',
      'tarification',
      'formule-composition',
    ]);
    expect(PRODUCT_SHEET_TABS_VISIBLE.every((t) => !/Apparence POS|Options POS|Matières et formats/i.test(t.label))).toBe(true);
  });

  it('maps legacy config tabs to new sheet', () => {
    expect(resolveProductSheetTab('formats')).toBe('formule-composition');
    expect(resolveProductSheetTab('formules')).toBe('formule-composition');
    expect(resolveProductSheetTab('sim')).toBe('tarification');
    expect(resolveProductSheetTab('prix')).toBe('tarification');
    expect(resolveProductSheetTab('apparence-pos')).toBe('general');
    expect(resolveProductSheetTab('matieres-formats')).toBe('formule-composition');
    expect(resolveProductSheetTab('options-finitions')).toBe('general');
    expect(resolveProductSheetTab('historique')).toBe('formule-composition');
  });

  it('maps pricing sections to sheet tabs', () => {
    expect(productSheetTabForSection('paliers')).toBe('tarification');
    expect(productSheetTabForSection('formule')).toBe('formule-composition');
    expect(productSheetTabForSection('infos')).toBe('general');
  });
});

describe('validation checklist', () => {
  it('blocks when price missing, never requires POS visibility', () => {
    const r = buildPublishChecklist({
      articleId: 'sku-1',
      articleLabel: 'Flyer A5',
      family: 'flyers',
      optionGroupCount: 2,
      visiblePosOptionCount: 0,
      prixBase: null,
      tierCount: 0,
    });
    expect(r.canPublish).toBe(false);
    expect(r.items.some((i) => i.id === 'price')).toBe(true);
    expect(r.items.some((i) => i.id === 'pos-visibility')).toBe(false);
  });

  it('allows when essentials are present', () => {
    const r = buildPublishChecklist({
      articleId: 'sku-1',
      articleLabel: 'Flyer A5',
      family: 'flyers',
      prixBase: 500,
      hasFormula: true,
      formulaPublished: true,
      optionGroupCount: 3,
      materialCount: 1,
      tierCount: 2,
      anomalyCount: 0,
    });
    expect(r.canPublish).toBe(true);
    expect(r.blockingCount).toBe(0);
  });

  it('detects overlapping and negative tiers', () => {
    const bad = analyzeTiers([
      { minQty: 1, maxQty: 50, unitPrice: 100, active: true },
      { minQty: 40, maxQty: 100, unitPrice: -10, active: true },
    ]);
    expect(bad.overlapping).toBe(true);
    expect(bad.negativePrice).toBe(true);

    const ok = analyzeTiers([
      { minQty: 1, maxQty: 9, unitPrice: 100, active: true },
      { minQty: 10, maxQty: 49, unitPrice: 90, active: true },
    ]);
    expect(ok.overlapping).toBe(false);
    expect(ok.negativePrice).toBe(false);
  });
});
