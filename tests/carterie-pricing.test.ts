import { describe, expect, it, beforeEach } from 'vitest';
import { normalizePaperInConfig } from '@/lib/data/paper-material';
import { calculatePiecesPerSheet, parseCardDimensionsMm } from '@/lib/pricing/carterie-imposition';
import { computeCarteriePrice } from '@/lib/pricing/carterie-pricing';
import {
  resetCarterieRuntimeParams,
  setCarterieRuntimeParams,
} from '@/lib/pricing/carterie-pricing-rules';

describe('carterie imposition', () => {
  it('parse 85×55 mm', () => {
    expect(parseCardDimensionsMm('85×55 mm')).toEqual({ w: 85, h: 55 });
    expect(parseCardDimensionsMm('Carré — 55×55 mm')).toEqual({ w: 55, h: 55 });
  });

  it('85×55 sur A4 → 10 pièces (rotation)', () => {
    const r = calculatePiecesPerSheet({
      sheetFormat: 'A4',
      cardWidth: 85,
      cardHeight: 55,
      marginMm: 0,
      gapMm: 0,
      allowRotation: true,
    });
    expect(r.pieces).toBe(10);
  });

  it('capacité manuelle prioritaire', () => {
    const r = calculatePiecesPerSheet({
      sheetFormat: 'A4',
      cardWidth: 85,
      cardHeight: 55,
      manualPieces: 12,
    });
    expect(r.pieces).toBe(12);
    expect(r.source).toBe('manual');
  });
});

describe('carterie prix exemple 670 Ar', () => {
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

  it('PCB 300g pelliculée + gaufrage + découpe = 670 Ar / pièce', () => {
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
    expect(r.prixImpressionFeuille).toBe(2000);
    expect(r.prixFinitionsFeuille).toBe(4200); // 1200 + 3000
    expect(r.prixFeuilleTotal).toBe(6200);
    expect(r.piecesParFeuille).toBe(10);
    expect(r.prixParPieceAvantDecoupe).toBe(620);
    expect(r.prixDecoupeParPiece).toBe(50);
    expect(r.prixUnitaireAvantRemise).toBe(670);
  });

  it('sans finition : (2000/10)+50 = 250', () => {
    const r = computeCarteriePrice(
      {
        format: '85×55 mm',
        matiere: 'PCB',
        grammage: '300g',
        face: 'Recto',
        pelliculage: 'Sans',
        gaufrage: 'Sans',
        decoupe: 'Oui — droite (50 Ar/pièce)',
      },
      50,
      { impressionFeuille: 2000, piecesParFeuille: 10, decoupeParPiece: 50 },
    );
    expect(r.prixUnitaireAvantRemise).toBe(250);
  });

  it('coins arrondis ajoutés sur la feuille puis divisés', () => {
    const r = computeCarteriePrice(
      {
        format: '85×55 mm',
        matiere: 'PCB',
        grammage: '300g',
        face: 'Recto',
        coins: 'Coin arrondi',
        pelliculage: 'Sans',
        gaufrage: 'Sans',
        decoupe: 'Sans',
      },
      50,
      { impressionFeuille: 2000, coinsParFeuille: 50, piecesParFeuille: 10, decoupeParPiece: 0 },
    );
    // (2000+50)/10 = 205
    expect(r.prixUnitaireAvantRemise).toBe(205);
  });

  it('format personnalisé sans dims → capacité à définir', () => {
    const r = computeCarteriePrice(
      {
        format: 'Format personnalisé',
        matiere: 'PCB',
        grammage: '300g',
        face: 'Recto',
      },
      50,
      { impressionFeuille: 2000 },
    );
    expect(r.calculable).toBe(false);
    expect(r.missingField).toBe('pieces_par_feuille');
  });
});

describe('carterie grille PRIX 2026 (Excel Carte de visite)', () => {
  beforeEach(() => {
    resetCarterieRuntimeParams();
  });

  it('PCB recto 50–199 = 200 Ar / pièce (pas 1200)', () => {
    const r = computeCarteriePrice(
      {
        format: '85×55 mm',
        matiere: 'PCB',
        grammage: '300g',
        face: 'Recto',
        pelliculage: 'Sans',
        gaufrage: 'Sans',
        decoupe: 'Oui — droite (50 Ar/pièce)',
      },
      50,
    );
    expect(r.calculable).toBe(true);
    expect(r.pricingMode).toBe('excel_grid');
    expect(r.prixUnitaire).toBe(200);
    expect(r.prixDecoupeParPiece).toBe(0);
  });

  it('PCB recto qty 500 → palier 200–999 = 175 Ar', () => {
    const r = computeCarteriePrice(
      {
        format: '85×55 mm',
        matiere: 'PCB',
        grammage: '300g',
        face: 'Recto',
        pelliculage: 'Sans',
      },
      500,
    );
    expect(r.prixUnitaire).toBe(175);
  });

  it('PCB 350G recto 50 = 350 Ar', () => {
    const r = computeCarteriePrice(
      {
        format: '85×55 mm',
        matiere: 'PCB',
        grammage: '350g',
        face: 'Recto',
      },
      50,
    );
    expect(r.prixUnitaire).toBe(350);
  });

  it('Recto-verso PCB 50 = 350 Ar', () => {
    const r = computeCarteriePrice(
      {
        format: '85×55 mm',
        matiere: 'PCB',
        grammage: '300g',
        face: 'Recto-verso',
      },
      50,
    );
    expect(r.prixUnitaire).toBe(350);
  });

  it('PVC opaque 1 mm recto 500 = 1200 Ar (après normalisation API)', () => {
    const { config } = normalizePaperInConfig({
      format: '85×55 mm',
      matiere: 'PVC opaque 1 mm',
      grammage: '1 mm',
      face: 'Recto',
      qty: 500,
    });
    const r = computeCarteriePrice(config, 500);
    expect(r.calculable).toBe(true);
    expect(r.pricingMode).toBe('excel_grid');
    expect(r.prixUnitaire).toBe(1200);
    expect(r.gridColumnLabel).toContain('PVC');
  });

  it('PCB 350g ≠ PCB 300g (grille distincte)', () => {
    const pcb300 = computeCarteriePrice(
      { format: '85×55 mm', matiere: 'PCB', grammage: '300g', face: 'Recto' },
      50,
    );
    const pcb350 = computeCarteriePrice(
      { format: '85×55 mm', matiere: 'PCB', grammage: '350g', face: 'Recto' },
      50,
    );
    expect(pcb300.prixUnitaire).toBe(200);
    expect(pcb350.prixUnitaire).toBe(350);
  });
});
