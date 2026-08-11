import { describe, expect, it } from 'vitest';
import {
  parseDirectSaleExcelRow,
  parseDirectSaleTierExcelRow,
  directSaleTierToExcelRow,
} from '@/lib/backoffice/direct-sale-excel-format';
import { formatTierQtyRange, formatTierDiscount } from '@/lib/direct-sale/tier-labels';
import {
  parseFinishingExcelRow,
  parseGrandFormatExcelRow,
  parseDesignExcelRow,
} from '@/lib/backoffice/pricing-tables-excel-format';
import { resolvePosArticleId } from '@/lib/services/direct-sale-pos-sync.service';
import { slugifyDirectSaleName } from '@/lib/direct-sale/categories';

function expectRow<T extends { row?: unknown; error?: unknown }>(r: T): NonNullable<T['row']> {
  expect(r).not.toHaveProperty('error');
  if (!('row' in r) || r.row == null) {
    throw new Error(`expected parsed row, got: ${JSON.stringify(r)}`);
  }
  return r.row as NonNullable<T['row']>;
}

describe('direct-sale-excel-format', () => {
  it('parseDirectSaleExcelRow reads standard columns', () => {
    const row = expectRow(
      parseDirectSaleExcelRow(
        {
          ID: '001',
          ARTICLE: 'Carte de visite',
          'CATÉGORIE': 'cartes',
          RÉFÉRENCE: 'cv-std',
          'PRIX UNITAIRE': 1200,
          'VISIBLE POS': 'oui',
          STATUT: 'publié',
        },
        2,
      ),
    );
    expect(row.name).toBe('Carte de visite');
    expect(row.unitPrice).toBe(1200);
    expect(row.status).toBe('published');
    expect(row.reference).toBe('cv-std');
  });

  it('parseDirectSaleTierExcelRow parses quantity tiers', () => {
    const row = expectRow(
      parseDirectSaleTierExcelRow(
        {
          ARTICLE: 'Carte de visite',
          'RÉFÉRENCE ARTICLE': 'cv-std',
          'QTÉ MIN': 101,
          'QTÉ MAX': 500,
          'TYPE REMISE': 'pourcentage',
          'VALEUR REMISE': 10,
        },
        3,
      ),
    );
    expect(row.discountType).toBe('percent');
    expect(row.discountValue).toBe(10);
  });

  it('parseDirectSaleExcelRow reads ORION workbook columns (PRIX UNITAIRE MAX)', () => {
    const row = expectRow(
      parseDirectSaleExcelRow(
        {
          ID: 'AVD013',
          ARTICLE: 'Carte de visite recto standard',
          'CATÉGORIE': 'Cartes',
          'PRIX UNITAIRE MAX (Ar)': 200,
          'TYPE PRIX': 'Direct avec paliers',
          'VISIBLE POS': 'oui',
          STATUT: 'Publié',
          'DÉTAIL POS': 'Prix max 1 pièce',
        },
        2,
      ),
    );
    expect(row.unitPrice).toBe(200);
    expect(row.status).toBe('published');
    expect(row.excelId).toBe('AVD013');
  });

  it('parseDirectSaleTierExcelRow reads ORION paliers with ID ARTICLE', () => {
    const row = expectRow(
      parseDirectSaleTierExcelRow(
        {
          ID: 'PAL0001',
          'ID ARTICLE': 'AVD008',
          ARTICLE: 'Roll up standard 200x80 cm',
          'QTÉ MIN': 1,
          'QTÉ MAX': 1,
          'PRIX UNITAIRE FINAL (Ar)': 150000,
          'TYPE REMISE': 'prix_unitaire',
          'REMISE %': 0,
          ACTIF: 'oui',
        },
        2,
      ),
    );
    expect(row.articleRef).toBe('AVD008');
    expect(row.finalUnitPrice).toBe(150000);
    expect(row.discountType).toBe('unit_price');
  });

  it('directSaleTierToExcelRow exports tier columns', () => {
    const row = directSaleTierToExcelRow(
      {
        minQty: 1,
        maxQty: 100,
        discountType: 'percent',
        discountValue: 10,
        finalUnitPrice: null,
        active: true,
        label: null,
      },
      { name: 'Carte de visite', reference: 'cv-std', excelId: '001' },
      '001',
    );
    expect(row['QTÉ MIN']).toBe(1);
    expect(row['TYPE REMISE']).toBe('pourcentage');
    expect(row.ARTICLE).toBe('Carte de visite');
  });
});

describe('tier labels', () => {
  it('formatTierQtyRange', () => {
    expect(formatTierQtyRange(1, 10)).toBe('1 – 10');
    expect(formatTierQtyRange(50, null)).toBe('50+');
  });

  it('formatTierDiscount', () => {
    expect(formatTierDiscount({ discountType: 'percent', discountValue: 10 })).toBe('-10 %');
  });
});

describe('helpers', () => {
  it('slugifyDirectSaleName', () => {
    expect(slugifyDirectSaleName('Carte de visite')).toContain('carte');
  });

  it('resolvePosArticleId', () => {
    expect(resolvePosArticleId({ reference: 'cv-std', slug: 'carte-de-visite' })).toBeTruthy();
  });
});

describe('pricing-tables-excel-format', () => {
  it('parseFinishingExcelRow reads finishing', () => {
    const row = expectRow(
      parseFinishingExcelRow(
        {
          ID: 'F01',
          FINITION: 'Pelliculage mat',
          TYPE: 'finition',
          PRIX: 500,
          'VISIBLE POS': 'oui',
        },
        2,
      ),
    );
    expect(row.name).toBe('Pelliculage mat');
    expect(row.unitPrice).toBe(500);
  });

  it('parseGrandFormatExcelRow reads m2 price', () => {
    const row = expectRow(
      parseGrandFormatExcelRow(
        {
          ID: 'GF01',
          ARTICLE: 'Bâche 440g',
          'PRIX M2': 45000,
          'VISIBLE POS': 'oui',
        },
        3,
      ),
    );
    expect(row.name).toBe('Bâche 440g');
    expect(row.pricePerM2).toBe(45000);
  });

  it('parseDesignExcelRow reads design service', () => {
    const row = expectRow(
      parseDesignExcelRow(
        {
          ID: 'D01',
          PRESTATION: 'Création logo',
          PRIX: 250000,
        },
        4,
      ),
    );
    expect(row.name).toBe('Création logo');
    expect(row.unitPrice).toBe(250000);
  });
});
