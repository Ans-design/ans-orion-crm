import { describe, expect, it } from 'vitest';
import {
  computeGoodiesUnitPrice,
  computeTapisExample,
  computeStyloExample,
  computePorteClePvcExample,
} from '@/lib/pricing/goodies-pricing';
import { filterOptionsByDependencies } from '@/lib/pos/apply-product-option-overrides';

describe('goodies-pricing', () => {
  it('tapis 20 cm + sublimation = 10000', () => {
    expect(computeTapisExample(9000, 1000)).toBe(10000);
    const r = computeGoodiesUnitPrice({
      articleId: 'gd-tapis',
      config: { format: 'Ø 20 cm (S)', technique: 'Sublimation' },
      optionHits: [
        { fieldKey: 'format', label: 'Ø 20 cm (S)', priceModifier: 9000 },
        { fieldKey: 'technique', label: 'Sublimation', priceModifier: 1000 },
      ],
    });
    expect(r.unitPrice).toBe(10000);
    expect(r.formula).toBe('9000+1000+0');
  });

  it('stylo 4 couleurs métal + impression = 4500', () => {
    expect(computeStyloExample(4000, 500)).toBe(4500);
    const r = computeGoodiesUnitPrice({
      articleId: 'gd-stylo',
      config: { type: 'Stylo 4 couleurs', technique: 'Impression' },
      optionHits: [
        { fieldKey: 'type', label: 'Stylo 4 couleurs', priceModifier: 4000 },
        { fieldKey: 'technique', label: 'Impression', priceModifier: 500 },
      ],
    });
    expect(r.unitPrice).toBe(4500);
  });

  it('porte-clé PVC souple = A4/20 + découpe + attache + technique', () => {
    expect(computePorteClePvcExample()).toBe(13000 / 20 + 50 + 300);
    const r = computeGoodiesUnitPrice({
      articleId: 'gd-portecles',
      config: { type: 'Porte-clés PVC souple', technique: 'Sans personnalisation' },
      optionHits: [
        { fieldKey: 'technique', label: 'Sans personnalisation', priceModifier: 0 },
      ],
      params: { pvcOpaqueA4: 13000, pvcDiviseurA4: 20, decoupe: 50, attache: 300 },
    });
    expect(r.unitPrice).toBe(1000);
  });

  it('filtre housse téléphone → formats téléphone', () => {
    const all = [
      'iPhone / Samsung standard',
      'Tablette 10"',
      'Laptop 13"',
      'Format personnalisé',
    ];
    const deps = [
      {
        sourceField: 'type',
        sourceValue: 'Housse téléphone',
        targetField: 'format',
        allowedValues: ['iPhone / Samsung standard', 'Format personnalisé'],
        action: 'filter',
      },
    ];
    const filtered = filterOptionsByDependencies('format', all, { type: 'Housse téléphone' }, deps);
    expect(filtered).toEqual(['iPhone / Samsung standard', 'Format personnalisé']);
    expect(filtered).not.toContain('Tablette 10"');
  });
});
