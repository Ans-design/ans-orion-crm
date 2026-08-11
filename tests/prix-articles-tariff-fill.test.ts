import { describe, expect, it } from 'vitest';
import { fillEmptyPrixArticleTariffs } from '@/lib/backoffice/prix-articles-tariff-fill';
import type { PrixArticleBaseRow } from '@/lib/backoffice/prix-articles-variant-rows';

function base(overrides: Partial<PrixArticleBaseRow> = {}): PrixArticleBaseRow {
  return {
    id: 'x1',
    excelId: null,
    name: 'Carte de visite perso',
    category: 'carterie',
    subCategory: null,
    reference: 'cv-std',
    materialKey: null,
    materialName: null,
    defaultColor: null,
    defaultSize: null,
    defaultFormat: null,
    defaultPrintFace: null,
    blankUnitPrice: null,
    marginPercent: null,
    unitPrice: 0,
    visiblePOS: true,
    status: 'published',
    ...overrides,
  };
}

describe('fillEmptyPrixArticleTariffs', () => {
  it('ne touche pas aux prix déjà renseignés', () => {
    const [out] = fillEmptyPrixArticleTariffs([
      base({ blankUnitPrice: 90, unitPrice: 220 }),
    ]);
    expect(out.blankUnitPrice).toBe(90);
    expect(out.unitPrice).toBe(220);
  });

  it('complète depuis grille / Catalogue Articles 2026 (cv-std)', () => {
    const [out] = fillEmptyPrixArticleTariffs([base()]);
    expect(out.unitPrice).toBeGreaterThan(0);
    expect(out.blankUnitPrice).toBeGreaterThan(0);
    expect(Number(out.blankUnitPrice)).toBeLessThanOrEqual(out.unitPrice);
  });

  it('déduit le vierge depuis l’imprimé Excel si besoin', () => {
    const [out] = fillEmptyPrixArticleTariffs([
      base({ unitPrice: 500, blankUnitPrice: null, name: 'Flyer A5 perso', category: 'flyers', reference: 'fly-std' }),
    ]);
    expect(out.unitPrice).toBe(500);
    expect(out.blankUnitPrice).toBeGreaterThan(0);
    expect(Number(out.blankUnitPrice)).toBeLessThan(500);
  });

  it('ne invente pas hors Excel / grille', () => {
    const [out] = fillEmptyPrixArticleTariffs([
      base({
        name: 'Article fantôme sans grille',
        reference: 'zzz-unknown-no-grid',
        category: 'divers',
        unitPrice: 0,
        blankUnitPrice: null,
      }),
    ]);
    expect(out.unitPrice).toBe(0);
    expect(out.blankUnitPrice == null || Number(out.blankUnitPrice) === 0).toBe(true);
  });
});
