import { describe, expect, it } from 'vitest';
import {
  assessMigrationReadiness,
  MIGRATION_PILOT_ARTICLES,
  migrationTolerancePercent,
} from '@/lib/pricing/compare-pricing-migration';
import {
  buildDiscountTiersFromSalePriceRows,
  parseSalePriceQtyTier,
} from '@/lib/pricing/migrate-from-sale-price2026';
import { resolveMigrationPilotConfig } from '@/lib/pricing/migration-pilot-configs';

describe('parseSalePriceQtyTier', () => {
  it('parse les paliers classiques PRIX 2026', () => {
    expect(parseSalePriceQtyTier('1-9')).toEqual({ minQty: 1, maxQty: 9 });
    expect(parseSalePriceQtyTier('10 à 49')).toEqual({ minQty: 10, maxQty: 49 });
    expect(parseSalePriceQtyTier('500+')).toEqual({ minQty: 500, maxQty: null });
  });
});

describe('buildDiscountTiersFromSalePriceRows', () => {
  it('agrège les lignes par palier qty', () => {
    const tiers = buildDiscountTiersFromSalePriceRows(
      [
        {
          id: 'a',
          sourceId: null,
          productNormalized: 'Flyer A4',
          format: 'A4',
          face: 'Recto-verso',
          material: 'PCB',
          grammage: '300g',
          qtyTier: '1-9',
          salePriceAr: 80,
          sourcePriceAr: 80,
        },
        {
          id: 'b',
          sourceId: null,
          productNormalized: 'Flyer A4',
          format: 'A4',
          face: 'Recto-verso',
          material: 'PCB',
          grammage: '300g',
          qtyTier: '100-249',
          salePriceAr: 30,
          sourcePriceAr: 30,
        },
      ],
      { format: 'A4', matiere: 'PCB', grammage: '300g', face: 'Recto-verso', qty: 100 },
      ['Flyer'],
      80,
    );

    expect(tiers).toHaveLength(2);
    expect(tiers[0].minQty).toBe(1);
    expect(tiers[0].unitPrice).toBe(80);
    expect(tiers[1].unitPrice).toBe(30);
  });
});

describe('assessMigrationReadiness', () => {
  it('accepte un écart dans la tolérance', () => {
    const r = assessMigrationReadiness({
      articleId: 'fly-a4',
      qty: 100,
      legacyUnit: 100,
      legacyTotal: 10000,
      legacySource: 'priceTiers',
      dynamicUnit: 102,
      dynamicTotal: 10200,
      dynamicSource: 'dynamicDiscountTier',
      deltaUnit: 2,
      deltaPercent: 2,
      hasProfile: true,
      isPublished: false,
    });
    expect(r.ready).toBe(true);
  });

  it('tolère davantage les moteurs familiaux', () => {
    expect(migrationTolerancePercent('livresTarif', 'dynamicPrixBase')).toBe(15);
    expect(migrationTolerancePercent('priceTiers', 'dynamicDiscountTier')).toBe(5);
  });
});

describe('migration-pilot-configs', () => {
  it('fournit une config complète par pilote', () => {
    for (const articleId of MIGRATION_PILOT_ARTICLES) {
      const config = resolveMigrationPilotConfig(articleId);
      expect(config.qty).toBeGreaterThan(0);
      expect(Object.keys(config).length).toBeGreaterThan(1);
    }
  });

  it('utilise cv-std (catalogue réel)', () => {
    expect(MIGRATION_PILOT_ARTICLES).toContain('cv-std');
    expect(resolveMigrationPilotConfig('cv-std').matiere).toBeTruthy();
  });
});
