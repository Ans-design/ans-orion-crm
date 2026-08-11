import { describe, expect, it } from 'vitest';
import {
  applyFinitionArticlePricing,
  resolveCollageBasePrice,
  resolveDorureBasePrice,
  resolvePerforationBasePrice,
} from '@/lib/finition/finition-pricing';
import { normalizeFormatId, formatFactor, PELLICULAGE_FORMATS } from '@/lib/finition/finition-formats';
import { SPIRALES } from '@/lib/data/catalogue';
import { spiralPriceForMm } from '@/lib/finition/finition-price-catalog';
import { listCanonicalFinishingCatalog } from '@/lib/finition/finition-price-catalog';

describe('finition format normalize', () => {
  it('extrait A4 depuis chip commercial', () => {
    expect(normalizeFormatId('A4 — 210×297 mm')).toBe('A4');
    expect(normalizeFormatId('A3 — 297×420 mm')).toBe('A3');
    expect(normalizeFormatId('A3+ — 320×450 mm')).toBe('A3_PLUS');
    expect(formatFactor('A4 — 210×297 mm', PELLICULAGE_FORMATS)).toBe(1);
    expect(formatFactor('A3 — 297×420 mm', PELLICULAGE_FORMATS)).toBe(2);
    expect(formatFactor('A5 — 148×210 mm', PELLICULAGE_FORMATS)).toBe(0.5);
  });
});

describe('finition prix métier', () => {
  it('coins 100 feuilles = 5 000 Ar total (sans remise volume)', () => {
    const r = applyFinitionArticlePricing('fin-coins', 50, {}, 100);
    expect(r.prixUnitaire).toBe(50);
    expect(r.prixUnitaire * 100).toBe(5000);
  });

  it('collage A4 500 · contre 500 · A3 simple 1000 (PRIX 2026)', () => {
    expect(resolveCollageBasePrice({ type: 'Collage simple' }, 0)).toBe(500);
    expect(resolveCollageBasePrice({ type: 'Contre-collage' }, 0)).toBe(500);
    const a4 = applyFinitionArticlePricing(
      'fin-collage',
      0,
      { type: 'Collage simple', dim: 'A4 — 210×297 mm' },
      1,
    );
    expect(a4.prixUnitaire).toBe(500);
    const a3 = applyFinitionArticlePricing(
      'fin-collage',
      0,
      { type: 'Collage simple', dim: 'A3 — 297×420 mm' },
      1,
    );
    expect(a3.prixUnitaire).toBe(1000);
  });

  it('couture oriflamme forfait Excel 30 000 / 40 000 Ar', () => {
    const simple = applyFinitionArticlePricing(
      'fin-couture',
      0,
      { type: 'Couture simple', longueur: 2, largeur: 1 },
      1,
    );
    expect(simple.prixUnitaire).toBe(30000);
    const renforcee = applyFinitionArticlePricing(
      'fin-couture',
      0,
      { type: 'Couture renforcée (maxi)' },
      1,
    );
    expect(renforcee.prixUnitaire).toBe(40000);
  });

  it('découpe droite 50 · flex 2 m = 20000 · photobooth 1 m² = 60000 (PRIX 2026)', () => {
    expect(
      applyFinitionArticlePricing('fin-decoupe', 0, { type: 'Découpe droite' }, 1).prixUnitaire,
    ).toBe(50);
    expect(
      applyFinitionArticlePricing(
        'fin-decoupe',
        0,
        { type: 'Découpe finition (Flex)', longueur: 200 },
        1,
      ).prixUnitaire,
    ).toBe(20000);
    expect(
      applyFinitionArticlePricing(
        'fin-decoupe',
        0,
        { type: 'Découpe photobooth PVC/Plexi', longueur: 1, largeur: 1 },
        1,
      ).prixUnitaire,
    ).toBe(60000);
  });

  it('dorure texte A4=3000 · A3=6000 · logo A4=4000 · motif=5000', () => {
    expect(resolveDorureBasePrice({ complexite: 'Texte' }, 0)).toBe(3000);
    expect(
      applyFinitionArticlePricing(
        'fin-dorure',
        0,
        { complexite: 'Texte', dim: 'A4 — 210×297 mm', face: 'Recto seul' },
        1,
      ).prixUnitaire,
    ).toBe(3000);
    expect(
      applyFinitionArticlePricing(
        'fin-dorure',
        0,
        { complexite: 'Texte', dim: 'A3 — 297×420 mm', face: 'Recto seul' },
        1,
      ).prixUnitaire,
    ).toBe(6000);
    expect(
      applyFinitionArticlePricing(
        'fin-dorure',
        0,
        { complexite: 'Logo', dim: 'A4', face: 'Recto seul' },
        1,
      ).prixUnitaire,
    ).toBe(4000);
    expect(
      applyFinitionArticlePricing(
        'fin-dorure',
        0,
        { complexite: 'Motif de fond', dim: 'A4', face: 'Recto seul' },
        1,
      ).prixUnitaire,
    ).toBe(5000);
  });

  it('pelliculage A4=600 · A3=1200', () => {
    expect(
      applyFinitionArticlePricing(
        'fin-pelliculage',
        600,
        { dim: 'A4 — 210×297 mm', face: 'Recto' },
        1,
      ).prixUnitaire,
    ).toBe(600);
    expect(
      applyFinitionArticlePricing(
        'fin-pelliculage',
        600,
        { dim: 'A3 — 297×420 mm', face: 'Recto' },
        1,
      ).prixUnitaire,
    ).toBe(1200);
  });

  it('perforation 1/2/4 trous', () => {
    expect(resolvePerforationBasePrice({ type: 'Perforation 1 trou' }, 0)).toBe(50);
    expect(resolvePerforationBasePrice({ type: 'Perforation 2 trous' }, 0)).toBe(100);
    expect(resolvePerforationBasePrice({ type: 'Perforation 4 trous' }, 0)).toBe(150);
  });

  it('plastification A4=2000 (recto=R/V, PRIX 2026)', () => {
    expect(
      applyFinitionArticlePricing('fin-plastification', 0, { dim: 'A4 — 210×297 mm' }, 1)
        .prixUnitaire,
    ).toBe(2000);
  });

  it('pose A4 3000 (PRIX 2026) · GF hauteur 2m 10k · hauteur 4m 20k', () => {
    expect(
      applyFinitionArticlePricing('fin-autocollant', 0, { type: 'Pose petit format' }, 1)
        .prixUnitaire,
    ).toBe(3000);
    expect(
      applyFinitionArticlePricing(
        'fin-autocollant',
        0,
        {
          type: 'Pose vinyle grand format',
          longueur_pose: 2,
          largeur_pose: 1,
          hauteur_pose: 'Moins de 3 m — 10 000 Ar/m²',
        },
        1,
      ).prixUnitaire,
    ).toBe(20000);
    expect(
      applyFinitionArticlePricing(
        'fin-autocollant',
        0,
        {
          type: 'Pose vinyle grand format',
          longueur_pose: 4,
          largeur_pose: 2,
          hauteur_pose: 'Plus de 3 m — 20 000 Ar/m²',
        },
        1,
      ).prixUnitaire,
    ).toBe(160000);
  });

  it('rainage 1 pli A4=50 · 2 plis=100 (PRIX 2026)', () => {
    expect(
      applyFinitionArticlePricing(
        'fin-rainage',
        0,
        { plis: '1 pli', dim: 'A4 — 210×297 mm' },
        1,
      ).prixUnitaire,
    ).toBe(50);
    expect(
      applyFinitionArticlePricing(
        'fin-rainage',
        0,
        { plis: '2 plis', dim: 'A4 — 210×297 mm' },
        1,
      ).prixUnitaire,
    ).toBe(100);
  });

  it('spirale 6/8/10 mm = 3000/4000/6000 (PRIX 2026)', () => {
    expect(spiralPriceForMm(6)).toBe(3000);
    expect(spiralPriceForMm(8)).toBe(4000);
    expect(spiralPriceForMm(10)).toBe(6000);
    expect(SPIRALES.find((s) => s.mm === 6)?.px).toBe(3000);
    expect(SPIRALES.find((s) => s.mm === 8)?.px).toBe(4000);
    expect(SPIRALES.find((s) => s.mm === 10)?.px).toBe(6000);
  });

  it('vernis A4=5000 · A3=10000', () => {
    expect(
      applyFinitionArticlePricing(
        'fin-vernis',
        5000,
        { dim: 'A4 — 210×297 mm', face: 'Recto' },
        1,
      ).prixUnitaire,
    ).toBe(5000);
    expect(
      applyFinitionArticlePricing(
        'fin-vernis',
        5000,
        { dim: 'A3 — 297×420 mm', face: 'Recto' },
        1,
      ).prixUnitaire,
    ).toBe(10000);
  });

  it('catalogue Admin sans textiles / Bob / CV', () => {
    const names = listCanonicalFinishingCatalog().map((r) => r.name.toLowerCase());
    expect(names.some((n) => n.includes('bob'))).toBe(false);
    expect(names.some((n) => n.includes('casquette'))).toBe(false);
    expect(names.some((n) => n.includes('visite'))).toBe(false);
    expect(names.some((n) => n.includes('flyer'))).toBe(false);
  });
});
