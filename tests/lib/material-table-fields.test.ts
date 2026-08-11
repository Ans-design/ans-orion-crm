import { describe, expect, it } from 'vitest';
import {
  buildCatalogLabel,
  deriveMainCharacteristic,
  deriveMaterialTableFields,
} from '@/lib/backoffice/material-table-fields';
import type { MaterialPriceUnifiedRow } from '@/components/backoffice-v2/pricing-custom/material-prices/types';

function row(partial: Partial<MaterialPriceUnifiedRow>): MaterialPriceUnifiedRow {
  return {
    id: 'cmr8u63q003it',
    name: 'Bristol 250g',
    grammage: '250g',
    thickness: null,
    materialKey: 'bristol-250',
    family: 'Petit format',
    basePrintPrice: 1000,
    visiblePOS: true,
    publicationStatus: 'published',
    anomalies: [],
    anomaliesCount: 0,
    stockItemId: null,
    stockSku: null,
    stockDisplay: null,
    stockStatus: null,
    ...partial,
  } as MaterialPriceUnifiedRow;
}

describe('deriveMaterialTableFields', () => {
  it('sépare Bristol 250g en matière + caractéristique grammage', () => {
    const f = deriveMaterialTableFields(row({ name: 'Bristol 250g', grammage: '250g' }));
    expect(f.materialName).toBe('Bristol 250g');
    expect(f.mainCharacteristic?.type).toBe('grammage');
    expect(f.mainCharacteristic?.displayValue).toBe('250g');
    expect(f.mainCharacteristic?.display).toBe('Grammage · 250g');
    expect(f.primaryReference).toBe('BRISTOL-250');
    expect(f.secondaryReference).toBeNull();
  });

  it('utilise le SKU stock comme référence secondaire métier', () => {
    const f = deriveMaterialTableFields(
      row({ name: 'Bristol 250g', grammage: '250g', stockSku: 'STK-BRI-250' }),
    );
    expect(f.primaryReference).toBe('BRISTOL-250');
    expect(f.secondaryReference).toBe('STK-BRI-250');
  });

  it('n’expose pas l’id technique comme référence secondaire', () => {
    const f = deriveMaterialTableFields(
      row({ id: 'cmrqjlw150000tla4hppb0gye', name: 'Acrylic 3mm', thickness: '3mm', materialKey: 'acrylic:3mm' }),
    );
    expect(f.primaryReference).toBe('ACRYLIC:3MM');
    expect(f.secondaryReference).toBeNull();
  });

  it('sépare Acrylic 3mm en épaisseur uniquement', () => {
    const f = deriveMaterialTableFields(
      row({ id: 'cmr9abc', name: 'Acrylic 3mm', grammage: null, thickness: '3mm', materialKey: 'acrylic-3mm' }),
    );
    expect(f.materialName).toBe('Acrylic 3mm');
    expect(f.mainCharacteristic?.type).toBe('epaisseur');
    expect(f.mainCharacteristic?.displayValue).toBe('3mm');
    expect(f.primaryReference).toBe('ACRYLIC-3MM');
  });

  it('corrige 3mm dans grammage comme épaisseur incohérente', () => {
    const c = deriveMainCharacteristic(row({ name: 'Acrylic 3mm', grammage: '3mm', thickness: null }), 'Acrylic');
    expect(c?.type).toBe('epaisseur');
    expect(c?.isInconsistent).toBe(true);
  });

  it('gère Carton rigide 600g', () => {
    const f = deriveMaterialTableFields(
      row({ name: 'Carton rigide 600g', grammage: '600g', materialKey: 'carton-rigide-600' }),
    );
    expect(f.materialName).toBe('Carton rigide 600g');
    expect(f.mainCharacteristic?.display).toBe('Grammage · 600g');
    expect(f.primaryReference).toBe('CARTON-RIGIDE-600');
  });

  it('reconnaît la laize grand format', () => {
    const f = deriveMaterialTableFields(
      row({ name: 'Vinyle 160cm', grammage: '160cm', family: 'Grand format', materialKey: 'vinyle-160' }),
    );
    expect(f.mainCharacteristic?.type).toBe('laize');
    expect(f.mainCharacteristic?.displayValue).toBe('160cm');
  });

  it('bâche 440 en nombre seul = grammage, pas laize', () => {
    const f = deriveMaterialTableFields(
      row({ name: 'Bâche 440', grammage: '440', family: 'Grand format', materialKey: 'bache-440' }),
    );
    expect(f.mainCharacteristic?.type).toBe('grammage');
    expect(f.mainCharacteristic?.displayValue).toBe('440g');
  });

  it('bâche 440g/m²', () => {
    const f = deriveMaterialTableFields(
      row({ name: 'Bâche 440g/m²', grammage: '440g/m²', family: 'Grand format' }),
    );
    expect(f.materialName).toBe('Bâche 440g/m²');
    expect(f.mainCharacteristic?.type).toBe('grammage');
    expect(f.mainCharacteristic?.displayValue).toBe('440g/m²');
  });

  it('250 nu n’est pas classé en épaisseur', () => {
    const c = deriveMainCharacteristic(row({ name: 'Bristol', grammage: '250', thickness: null }), 'Bristol');
    expect(c?.type).toBe('grammage');
  });
});

describe('buildCatalogLabel', () => {
  it('recompose le libellé catalogue', () => {
    expect(buildCatalogLabel('Bristol', 'grammage', '250g')).toBe('Bristol 250g');
    expect(buildCatalogLabel('Acrylic', 'epaisseur', '3mm')).toBe('Acrylic 3mm');
  });
});
