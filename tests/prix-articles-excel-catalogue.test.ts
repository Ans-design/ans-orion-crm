import { describe, expect, it } from 'vitest';
import {
  PRIX_ARTICLES_CATALOGUE_EXPORT_COLUMNS,
  PRIX_ARTICLES_EXCEL_COLUMNS,
  prixArticleDisplayToCatalogueExcelRow,
  prixArticleToExcelRow,
} from '@/lib/backoffice/prix-articles-excel-format';
import {
  resolveIndicativeUnitCostAr,
  resolveMadagascarCostBenchmark,
} from '@/lib/backoffice/madagascar-article-cost-benchmarks';

describe('prix articles excel catalogue', () => {
  it('exporte les colonnes parents (round-trip)', () => {
    const row = prixArticleToExcelRow({
      id: 'abc',
      excelId: '42',
      name: 'Flyer A5',
      category: 'flyers',
      materialName: 'PCB',
      blankUnitPrice: 100,
      unitPrice: 250,
      visiblePOS: true,
      status: 'published',
      reference: 'fly-std',
    });
    expect(Object.keys(row)).toEqual([...PRIX_ARTICLES_EXCEL_COLUMNS]);
    expect(row['PRIX AVEC IMPRESSION']).toBe(250);
    expect(row['MARGE GAIN (Ar)']).toBe(150);
  });

  it('exporte une ligne catalogue avec coût MG et colonnes UI', () => {
    const row = prixArticleDisplayToCatalogueExcelRow({
      id: 'abc',
      excelId: 'fly-std',
      name: 'Flyer standard',
      category: 'flyers',
      materialName: 'Offset',
      defaultFormat: 'A5',
      defaultPrintFace: 'Recto-verso',
      blankUnitPrice: 80,
      unitPrice: 200,
      visiblePOS: true,
      status: 'published',
      reference: 'fly-std',
      unit: 'pièce',
      minQuantity: 50,
      description: 'Flyer promo',
      stockQty: 12,
    });
    expect(Object.keys(row)).toEqual([...PRIX_ARTICLES_CATALOGUE_EXPORT_COLUMNS]);
    expect(row.FAMILLE).toMatch(/flyers/i);
    expect(row['COUT INDICATIF (Ar)']).toBe(80);
    expect(row['SOURCE COUT']).toMatch(/vierge/i);
    expect(row.DISPO).toBe('Disponible');
    expect(row.DESCRIPTION).toBe('Flyer promo');
  });
});

describe('madagascar cost benchmarks', () => {
  it('résout carterie / textile', () => {
    expect(resolveMadagascarCostBenchmark('carterie', 'Carte de visite')?.saleFromAr).toBe(200);
    expect(resolveMadagascarCostBenchmark('textile', 'T-shirt')?.costMinAr).toBeGreaterThan(0);
  });

  it('préfère le prix vierge DB au milieu de fourchette', () => {
    const withBlank = resolveIndicativeUnitCostAr({
      blankUnitPrice: 120,
      category: 'flyers',
      name: 'Flyer',
    });
    expect(withBlank.costAr).toBe(120);
    expect(withBlank.source).toMatch(/Backoffice/i);

    const market = resolveIndicativeUnitCostAr({
      blankUnitPrice: null,
      category: 'flyers',
      name: 'Flyer',
    });
    expect(market.costAr).toBeGreaterThan(0);
    expect(market.source).toMatch(/indicatif/i);
  });
});
