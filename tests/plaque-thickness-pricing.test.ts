import { describe, expect, it } from 'vitest';
import {
  parsePlaqueThicknessMm,
  resolvePlaqueThicknessPrixM2,
  getPlaqueThicknessFamily,
} from '@/lib/grand-format/plaque-thickness-pricing';
import { validateGfConfig } from '@/lib/grand-format/gf-validation';
import { calculateGrandFormatPrice } from '@/lib/grand-format/calculate-grand-format-price';

describe('plaque thickness pricing', () => {
  it('détecte familles PVC / plexi', () => {
    expect(getPlaqueThicknessFamily('gf-pvc')).toBe('pvc');
    expect(getPlaqueThicknessFamily('gf-pvc6')).toBe('pvc');
    expect(getPlaqueThicknessFamily('gf-plexi')).toBe('plexi');
    expect(getPlaqueThicknessFamily('gf-acrylic')).toBe('plexi');
    expect(getPlaqueThicknessFamily('gf-bache')).toBeNull();
  });

  it('parse épaisseur chip et Autres', () => {
    expect(parsePlaqueThicknessMm({ epaisseur: '3 mm' })).toBe(3);
    expect(parsePlaqueThicknessMm({ epaisseur: '5mm' })).toBe(5);
    expect(parsePlaqueThicknessMm({ epaisseur: 'Autres', epaisseur_autre: '4,5' })).toBe(4.5);
    expect(parsePlaqueThicknessMm({ epaisseur: 'Autres' })).toBeNull();
  });

  it('PVC 3 mm → 110k, 5–6 mm → 160k, 10 mm sur devis', () => {
    expect(resolvePlaqueThicknessPrixM2('gf-pvc', { epaisseur: '3 mm' })?.prixM2).toBe(110_000);
    expect(resolvePlaqueThicknessPrixM2('gf-pvc', { epaisseur: '5 mm' })?.variantArticleId).toBe(
      'gf-pvc6',
    );
    expect(resolvePlaqueThicknessPrixM2('gf-pvc', { epaisseur: '6 mm' })?.prixM2).toBe(160_000);
    const thick = resolvePlaqueThicknessPrixM2('gf-pvc', { epaisseur: '10 mm' });
    expect(thick?.surDevis).toBe(true);
    expect(thick?.prixM2).toBeNull();
  });

  it('Plexi 3 mm → 200k, 5 mm → 240k', () => {
    expect(resolvePlaqueThicknessPrixM2('gf-plexi', { epaisseur: '3 mm' })?.prixM2).toBe(200_000);
    expect(resolvePlaqueThicknessPrixM2('gf-plexi', { epaisseur: '5 mm' })?.prixM2).toBe(240_000);
    expect(resolvePlaqueThicknessPrixM2('gf-acrylic', { epaisseur: '5 mm' })?.variantArticleId).toBe(
      'gf-plexi5',
    );
  });

  it('validation exige épaisseur ; plaque non requise en A0 ISO', () => {
    expect(
      validateGfConfig('gf-pvc', {
        format: 'A0',
        laize_plaque: '2m40',
        qty: 1,
      }),
    ).toMatch(/épaisseur/i);

    expect(
      validateGfConfig('gf-pvc', {
        format: 'A0',
        epaisseur: '3 mm',
        qty: 1,
      }),
    ).toBeNull();

    expect(
      validateGfConfig('gf-pvc', {
        format: 'Format personnalisé',
        largeur_cm: 100,
        hauteur_cm: 200,
        epaisseur: '3 mm',
        qty: 1,
      }),
    ).toMatch(/dimension plaque/i);

    expect(
      validateGfConfig('gf-pvc', {
        format: 'Format personnalisé',
        largeur_cm: 100,
        hauteur_cm: 200,
        laize_plaque: '2m40',
        epaisseur: '3 mm',
        qty: 1,
      }),
    ).toBeNull();
  });

  it('prix live PVC 6 mm A0 utilise 160k/m²', () => {
    const bill = calculateGrandFormatPrice({
      config: { format: 'A0', epaisseur: '6 mm', laize_plaque: '2m40' },
      availableLaizesCm: [120, 240],
      prixM2: resolvePlaqueThicknessPrixM2('gf-pvc', { epaisseur: '6 mm' })!.prixM2,
      stockKind: 'plaque',
      quantite: 1,
      useA0FractionPricing: true,
    });
    expect(bill.prixM2).toBe(160_000);
    expect(bill.calculable).toBe(true);
    expect(bill.prixUnitaireFinal).toBeGreaterThan(0);
  });
});
