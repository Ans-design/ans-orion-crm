import { describe, expect, it } from 'vitest';
import {
  computeMaterialsStats,
  mapToMaterialDto,
  EMPTY_MATERIALS_STATS,
} from '@/lib/server/modules/pricing/base-material.dto';
import { isPrismaMissingTableError } from '@/lib/server/modules/pricing/prisma-safe';

describe('base-material.dto', () => {
  it('mapToMaterialDto mappe les champs stables', () => {
    const dto = mapToMaterialDto({
      id: '1',
      materialKey: 'offset',
      label: 'Offset',
      family: 'Petit format',
      grammage: '80g',
      formatStandard: 'A4',
      widthMm: null,
      heightMm: null,
      dimensionUnit: 'mm',
      saleUnit: 'feuille',
      basePrintType: null,
      purchasePrice: 100,
      basePrintPrice: 200,
      maxPrice: 250,
      targetMargin: 30,
      minMargin: 10,
      active: true,
      visiblePos: true,
      impactsPrice: true,
      impactsStock: true,
      source: 'test',
      anomalyNotes: null,
      publicationStatus: 'published',
      updatedAt: new Date(),
      anomalies: ['Prix manquant'],
    });
    expect(dto.name).toBe('Offset');
    expect(dto.anomaliesCount).toBe(1);
    expect(dto.visiblePOS).toBe(true);
  });

  it('computeMaterialsStats compte missingPrice', () => {
    const stats = computeMaterialsStats([
      mapToMaterialDto({
        id: '1',
        materialKey: 'a',
        label: 'A',
        family: 'F',
        grammage: null,
        formatStandard: null,
        widthMm: null,
        heightMm: null,
        dimensionUnit: 'mm',
        saleUnit: 'pcs',
        basePrintType: null,
        purchasePrice: null,
        basePrintPrice: null,
        maxPrice: null,
        targetMargin: null,
        minMargin: null,
        active: true,
        visiblePos: true,
        impactsPrice: true,
        impactsStock: true,
        source: 't',
        anomalyNotes: null,
        publicationStatus: 'draft',
        updatedAt: new Date(),
        anomalies: [],
      }),
    ]);
    expect(stats.missingPrice).toBe(1);
    expect(stats.total).toBe(1);
  });

  it('EMPTY_MATERIALS_STATS est à zéro', () => {
    expect(EMPTY_MATERIALS_STATS.total).toBe(0);
  });
});

describe('prisma-safe', () => {
  it('détecte table manquante P2021', () => {
    expect(isPrismaMissingTableError({ code: 'P2021', message: 'table' })).toBe(true);
  });

  it('détecte délégué Prisma manquant', () => {
    expect(
      isPrismaMissingTableError(new Error("Cannot read properties of undefined (reading 'findMany')")),
    ).toBe(true);
  });
});
