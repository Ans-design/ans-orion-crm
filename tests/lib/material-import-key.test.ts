import { describe, expect, it } from 'vitest';
import { buildMaterialImportKey } from '@/lib/backoffice/material-import-key';

describe('material-import-key', () => {
  it('distingue Acrylic 1mm et 3mm', () => {
    const a = buildMaterialImportKey({
      materialName: 'Acrylic',
      characteristicType: 'epaisseur',
      characteristicValue: '1',
      priceUnit: 'm2',
      family: 'Grand format',
    });
    const b = buildMaterialImportKey({
      materialName: 'Acrylic',
      characteristicType: 'epaisseur',
      characteristicValue: '3',
      priceUnit: 'm2',
      family: 'Grand format',
    });
    expect(a).not.toBe(b);
  });

  it('même déclinaison = même clé', () => {
    const key1 = buildMaterialImportKey({
      materialName: 'Bristol',
      characteristicType: 'grammage',
      characteristicValue: '250g',
      priceUnit: 'feuille',
      family: 'Petit format',
    });
    const key2 = buildMaterialImportKey({
      materialName: 'bristol',
      characteristicType: 'grammage',
      characteristicValue: '250g',
      priceUnit: 'feuille',
      family: 'petit format',
    });
    expect(key1).toBe(key2);
  });
});
