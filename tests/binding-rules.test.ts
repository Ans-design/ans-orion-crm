import { describe, expect, it } from 'vitest';
import { BINDING_LABELS, computePhysicalSheets } from '@/lib/data/binding-catalog';
import {
  bindingCartSummaryLine,
  bindingValidationMessage,
  estimateSpineThicknessMm,
  evaluateBinding,
  getNearestMultiplesOf4,
  isBindingConfigValid,
  isMetalSpiralCompatible,
  validatePerfectBindingMinimum,
  validateSaddleStitchPageCount,
} from '@/lib/print/binding-rules';

describe('binding-rules', () => {
  it('convertit pages en feuilles physiques', () => {
    expect(computePhysicalSheets(40, 'recto')).toBe(40);
    expect(computePhysicalSheets(40, 'recto_verso')).toBe(20);
    expect(computePhysicalSheets(101, 'recto_verso')).toBe(51);
  });

  it('spirale plastique 40p R/V 80g → 8 mm 5/16"', () => {
    const ev = evaluateBinding(BINDING_LABELS.SPIRALE_PLASTIQUE, {
      pages: '40',
      face: 'Recto-Verso',
      grammage: '80g',
    });
    expect(ev.compatible).toBe(true);
    expect(ev.referenceLabel).toMatch(/8 mm/);
    expect(ev.referenceLabel).toMatch(/5\/16"/);
    expect(ev.physicalSheets).toBe(20);
    expect(ev.priceAr).toBe(4000);
  });

  it('spirale métallique bloquée au-delà de 16 mm', () => {
    const config = {
      pages: '200',
      face: 'Recto',
      grammage_int: '80g',
    };
    expect(isMetalSpiralCompatible(config)).toBe(false);
    const ev = evaluateBinding(BINDING_LABELS.SPIRALE_METAL, config);
    expect(ev.compatible).toBe(false);
    expect(ev.errors[0]).toMatch(/16 mm/);
  });

  it('piqûre exige pages divisibles par 4', () => {
    expect(validateSaddleStitchPageCount(42)).toBe(false);
    expect(getNearestMultiplesOf4(42)).toEqual({ lower: 40, upper: 44 });
    const ev = evaluateBinding(BINDING_LABELS.PIQURE, {
      pages: '42',
      grammage_int: '80g',
    });
    expect(ev.compatible).toBe(false);
    expect(ev.errors[0]).toMatch(/40 ou 44/);
  });

  it('piqûre 32p recto → agrafe 23/008', () => {
    const ev = evaluateBinding(BINDING_LABELS.PIQURE, {
      pages: '32',
      grammage_int: '80g',
    });
    expect(ev.compatible).toBe(true);
    expect(ev.referenceLabel).toMatch(/23\/008/);
    expect(ev.referenceLabel).toMatch(/8mm|8 mm/);
  });

  it('dos carré calcule épaisseur et tranche', () => {
    const ev = evaluateBinding(BINDING_LABELS.DCC, {
      pages: '80',
      face_interieur: 'Recto-Verso',
      grammage_int: '80g',
    });
    expect(ev.physicalSheets).toBe(40);
    expect(ev.spineMmCalculated).toBe(estimateSpineThicknessMm({ physicalSheets: 40, paperWeight: '80g' }));
    expect(ev.spineMmRange).toMatch(/6/);
    expect(ev.compatible).toBe(true);
  });

  it('dos carré 80g bloque moins de 40 pages', () => {
    const check = validatePerfectBindingMinimum({
      pageCount: 32,
      physicalSheets: 16,
      paperWeightGroup: '80g',
      spineMm: 2.4,
    });
    expect(check.valid).toBe(false);
    expect(check.message).toMatch(/40 pages/);
  });

  it('bindingCartSummaryLine inclut référence complète', () => {
    const line = bindingCartSummaryLine(
      {
        pages: '32',
        reliure: BINDING_LABELS.PIQURE,
        grammage_int: '80g',
      },
      'Booklet A5',
    );
    expect(line).toMatch(/32 pages/);
    expect(line).toMatch(/23\/008/);
  });

  it('isBindingConfigValid bloque config incohérente', () => {
    expect(
      isBindingConfigValid({
        type: BINDING_LABELS.PIQURE,
        pages: '30',
        grammage: '80g',
      }),
    ).toBe(false);
    expect(
      bindingValidationMessage({
        type: BINDING_LABELS.PIQURE,
        pages: '30',
        grammage: '80g',
      }),
    ).toMatch(/divisibles par 4/);
  });
});
