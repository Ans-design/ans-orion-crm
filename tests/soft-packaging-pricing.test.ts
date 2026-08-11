import { describe, expect, it } from 'vitest';
import { calculateDoypackPrice } from '@/lib/packaging/doypack-price';
import { calculatePrecutLabelPrice } from '@/lib/packaging/precut-label-price';
import { calculateCustomCupPrice } from '@/lib/packaging/custom-cup-price';
import { calculateHangtagPrice } from '@/lib/packaging/hangtag-price';

describe('Doypack price', () => {
  it('exemple métier 1 425 Ar (vierge 1000 + vinyle 100 + découpe 25 + pose 300)', () => {
    const r = calculateDoypackPrice({
      matiere: 'Kraft',
      format: '100×150mm',
      zoneImpression: 'Impression partielle personnalisée',
      printWidthMm: 50,
      printHeightMm: 50,
      matiereImpression: 'Vinyle blanc',
      decoupe: true,
      pose: true,
      qty: 1,
      prixViergeHt: 1000,
      prixVinylM2: 40_000,
      prixDecoupeM2: 10_000,
      prixPosePiece: 300,
    });
    expect(r.calculable).toBe(true);
    expect(r.surfaceImpressionM2).toBeCloseTo(0.0025, 6);
    expect(r.prixImpression).toBe(100);
    expect(r.prixDecoupe).toBe(25);
    expect(r.prixPose).toBe(300);
    expect(r.prixViergeHt).toBe(1000);
    expect(r.prixUnitaire).toBe(1425);
    expect(r.prixTotal).toBe(1425);
  });

  it('qty 100 → 142 500 Ar', () => {
    const r = calculateDoypackPrice({
      matiere: 'Kraft',
      format: '100×150mm',
      zoneImpression: 'Impression partielle personnalisée',
      printWidthMm: 50,
      printHeightMm: 50,
      qty: 100,
      prixViergeHt: 1000,
      prixVinylM2: 40_000,
      prixDecoupeM2: 10_000,
      prixPosePiece: 300,
    });
    expect(r.prixTotal).toBe(142_500);
  });

  it('sans impression → vierge seul', () => {
    const r = calculateDoypackPrice({
      matiere: 'Kraft',
      format: '100×150mm',
      zoneImpression: 'Sans impression',
      prixViergeHt: 1000,
      qty: 1,
    });
    expect(r.prixImpression).toBe(0);
    expect(r.prixDecoupe).toBe(0);
    expect(r.prixPose).toBe(0);
    expect(r.prixUnitaire).toBe(1000);
  });
});

describe('Étiquette prédécoupée', () => {
  it('50×50 cm vinyle blanc = 10 000 Ar', () => {
    const r = calculatePrecutLabelPrice({
      typeVinyle: 'Vinyle blanc',
      format: '50×50 cm',
      qty: 1,
    });
    expect(r.prixUnitaire).toBe(10_000);
  });

  it('50×50 cm vinyle transparent = 12 000 Ar', () => {
    const r = calculatePrecutLabelPrice({
      typeVinyle: 'Vinyle transparent',
      format: '50×50 cm',
      qty: 1,
    });
    expect(r.prixUnitaire).toBe(12_000);
  });

  it('perso 30×40 cm = surface 0.12 m² × vinyle + découpe', () => {
    const r = calculatePrecutLabelPrice({
      typeVinyle: 'Vinyle blanc',
      format: 'Format personnalisé',
      largeur: 30,
      hauteur: 40,
      unite: 'cm',
      prixVinylM2: 40_000,
      prixDecoupeM2: 10_000,
      qty: 1,
    });
    expect(r.surfaceM2).toBeCloseTo(0.12, 6);
    expect(r.prixVinyl).toBe(4_800);
    expect(r.prixDecoupe).toBe(1_200);
    expect(r.prixUnitaire).toBe(6_000);
  });
});

describe('Gobelet', () => {
  it('vierge + sticker 50×50 + découpe + pose', () => {
    const r = calculateCustomCupPrice({
      typeGobelet: 'Gobelet carton',
      contenance: '8 oz (240 ml)',
      zoneImpression: 'Impression partielle personnalisée',
      printWidthMm: 50,
      printHeightMm: 50,
      technique: 'Sticker / vinyle',
      prixViergeHt: 1000,
      prixVinylM2: 40_000,
      prixDecoupeM2: 10_000,
      prixPosePiece: 300,
      qty: 1,
    });
    expect(r.prixViergeHt).toBe(1000);
    expect(r.prixImpression).toBe(100);
    expect(r.prixDecoupe).toBe(25);
    expect(r.prixPose).toBe(300);
    expect(r.prixUnitaire).toBe(1425);
  });
});

describe('Hangtag', () => {
  it('ISF feuille / pièces + accessoires', () => {
    const r = calculateHangtagPrice({
      dimension: '85×55 mm',
      matiere: 'PCB',
      grammage: '300g',
      face: 'Recto',
      particularites: ['Cordelette', 'Œillet'],
      finitions: [],
      qty: 1,
      prixFeuilleIsf: 1000,
    });
    expect(r.calculable).toBe(true);
    expect(r.piecesParFeuille).toBe(10);
    expect(r.prixImpressionFeuille).toBe(1000);
    expect(r.prixParPieceAvantAccessoires).toBe(100);
    expect(r.accessoires.some((a) => a.label === 'Cordelette')).toBe(true);
    expect(r.prixUnitaire).toBeGreaterThan(100);
  });
});
