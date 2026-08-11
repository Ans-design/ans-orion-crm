/**
 * Non-régression prix — fige les acceptations métier pendant la refonte Admin CPS.
 * Ne pas modifier les montants sans mise à jour de PRICING_REGRESSION_SNAPSHOT.md
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { computeCarteriePrice } from '@/lib/pricing/carterie-pricing';
import {
  resetCarterieRuntimeParams,
  setCarterieRuntimeParams,
} from '@/lib/pricing/carterie-pricing-rules';
import { calculatePackagingBoxPrice } from '@/lib/packaging/packaging-box-price';
import { calculatePaperBagPrice } from '@/lib/packaging/paper-bag-price';
import { calculateDoypackPrice } from '@/lib/packaging/doypack-price';
import { calculateCustomCupPrice } from '@/lib/packaging/custom-cup-price';
import { calculatePrecutLabelPrice } from '@/lib/packaging/precut-label-price';

describe('PRICING REGRESSION SNAPSHOT', () => {
  describe('REG-CART-670', () => {
    beforeEach(() => {
      resetCarterieRuntimeParams();
      setCarterieRuntimeParams({
        pelliculageA4: 1200,
        gaufrageA4: 3000,
        prixDecoupeParPiece: 50,
        utilisePalier: false,
        sourcePrixBase: 'ISF uniquement',
      });
    });

    it('carterie 85×55 = 670 Ar', () => {
      const r = computeCarteriePrice(
        {
          format: '85×55 mm',
          matiere: 'PCB',
          grammage: '300g',
          face: 'Recto',
          pelliculage: 'Oui — Mat',
          gaufrage: 'Oui',
          decoupe: 'Oui — droite (50 Ar/pièce)',
        },
        100,
        {
          preferIsfImposition: true,
          impressionFeuille: 2000,
          pelliculageA4: 1200,
          gaufrageA4: 3000,
          decoupeParPiece: 50,
          piecesParFeuille: 10,
        },
      );
      expect(r.calculable).toBe(true);
      expect(r.prixUnitaireAvantRemise).toBe(670);
    });
  });

  it('REG-BOX-50400 packaging boîte A0', () => {
    const r = calculatePackagingBoxPrice({
      formatEquivalent: 'A0',
      matiere: 'PCB',
      grammage: '300g',
      finitions: ['Pelliculage mat'],
      qty: 1,
      prixA4Impression: 1500,
      pelliculageA4: 600,
      margeDechetsPct: 10,
      beneficePct: 30,
      margeDepensePct: 10,
    });
    expect(r.prixUnitaire).toBe(50_400);
  });

  it('REG-SAC-50400 sac papier A0', () => {
    const r = calculatePaperBagPrice({
      formatEquivalent: 'A0',
      matiere: 'PCB',
      grammage: '300g',
      finitions: ['Pelliculage mat'],
      poignees: 'Sans poignée',
      qty: 1,
      prixA4Impression: 1500,
      pelliculageA4: 600,
      margeDechetsPct: 10,
      beneficePct: 30,
      margeDepensePct: 10,
    });
    expect(r.prixUnitaire).toBe(50_400);
  });

  it('REG-DOY-1425 doypack', () => {
    const r = calculateDoypackPrice({
      matiere: 'Kraft',
      format: '100×150mm',
      zoneImpression: 'Impression partielle personnalisée',
      printWidthMm: 50,
      printHeightMm: 50,
      prixViergeHt: 1000,
      prixVinylM2: 40_000,
      prixDecoupeM2: 10_000,
      prixPosePiece: 300,
      qty: 1,
    });
    expect(r.prixUnitaire).toBe(1425);
  });

  it('REG-CUP-1425 gobelet', () => {
    const r = calculateCustomCupPrice({
      typeGobelet: 'Gobelet carton',
      contenance: '8 oz (240 ml)',
      zoneImpression: 'Impression partielle personnalisée',
      printWidthMm: 50,
      printHeightMm: 50,
      prixViergeHt: 1000,
      prixVinylM2: 40_000,
      prixDecoupeM2: 10_000,
      prixPosePiece: 300,
      qty: 1,
    });
    expect(r.prixUnitaire).toBe(1425);
  });

  it('REG-ETIQ-W-10000 / REG-ETIQ-T-12000', () => {
    expect(
      calculatePrecutLabelPrice({ typeVinyle: 'Vinyle blanc', format: '50×50 cm', qty: 1 })
        .prixUnitaire,
    ).toBe(10_000);
    expect(
      calculatePrecutLabelPrice({ typeVinyle: 'Vinyle transparent', format: '50×50 cm', qty: 1 })
        .prixUnitaire,
    ).toBe(12_000);
  });
});
