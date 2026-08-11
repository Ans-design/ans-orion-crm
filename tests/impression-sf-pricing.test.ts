import { describe, expect, it } from 'vitest';
import {
  ansCalcRectoVersoPrice,
  applyImpressionColorCoeff,
  computeImpressionSfPrice,
  impressionSfFormatFactor,
  impressionSfVolumeRemiseRate,
  paperTierUnitPrice,
  resolveImpressionSfPaperPriceKey,
} from '@/lib/pricing/impression-sf-pricing';
import { IMPRESSION_SF_PAPER_TARIFFS } from '@/lib/data/impression-sf-paper-tariffs';

describe('impression-sf-paper-tariffs', () => {
  it('reprend les grilles PRIX_2026 de base ok.html', () => {
    expect(IMPRESSION_SF_PAPER_TARIFFS.nb80.tiers[0].px).toBe(200);
    expect(IMPRESSION_SF_PAPER_TARIFFS.pcb90.tiers.at(-1)?.px).toBe(270);
    expect(IMPRESSION_SF_PAPER_TARIFFS.sublimation.tiers.at(-1)?.max).toBe(2000);
  });
});

describe('resolveImpressionSfPaperPriceKey', () => {
  it('sépare Offset N&B et couleur', () => {
    expect(resolveImpressionSfPaperPriceKey('Standard / Offset', '80g', 'Impression numérique N&B')).toBe('nb80');
    expect(resolveImpressionSfPaperPriceKey('Standard / Offset', '80g', 'Impression numérique couleur')).toBe('q80la');
  });

  it('distingue PCB/PCM/Glossy par grammage', () => {
    expect(resolveImpressionSfPaperPriceKey('PCB', '90g', 'Impression numérique couleur')).toBe('pcb90');
    // Catalogue 2026 : 300g = 1 500 Ar/A4 (grille pcb350), pas 1 000
    expect(resolveImpressionSfPaperPriceKey('PCM', '300g', 'Impression numérique couleur')).toBe('pcb350');
    expect(resolveImpressionSfPaperPriceKey('PCB', '300g', 'Impression numérique couleur')).toBe('pcb350');
    expect(resolveImpressionSfPaperPriceKey('PCM', '250g', 'Impression numérique couleur')).toBe('pcb170');
    expect(resolveImpressionSfPaperPriceKey('PCM', '350g', 'Impression numérique couleur')).toBe('pcb350');
    expect(resolveImpressionSfPaperPriceKey('Glossy', '600g (300g×2)', 'Impression numérique couleur')).toBe('pcb600');
    expect(resolveImpressionSfPaperPriceKey('PCB', '900g', 'Impression numérique couleur')).toBe('pcb900');
  });

  it('PCB/PCM 300g A4 recto = 1500 Ar (palier qty ≤49)', () => {
    const key = resolveImpressionSfPaperPriceKey('PCB', '300g', 'Impression numérique couleur');
    expect(key).toBe('pcb350');
    expect(paperTierUnitPrice(key!, 10)).toBe(1500);
    expect(paperTierUnitPrice(key!, 1)).toBe(1500);
  });

  it('résout matières spéciales', () => {
    expect(resolveImpressionSfPaperPriceKey('PVC translucide', '', 'Impression numérique couleur')).toBe('pvc_transl');
    expect(resolveImpressionSfPaperPriceKey('PVC translucide 1 mm', '1 mm', 'Impression numérique couleur')).toBe('pvc_transl');
    expect(paperTierUnitPrice('pvc_transl', 1)).toBe(4500);
    expect(resolveImpressionSfPaperPriceKey('Papier sublimation', '', 'Impression numérique couleur')).toBe('sublimation');
    expect(resolveImpressionSfPaperPriceKey('Toile fin', '270g', 'Impression numérique couleur')).toBe('toile');
    expect(resolveImpressionSfPaperPriceKey('Spécial invitation', '300g', 'Impression numérique couleur')).toBe('invitation');
    expect(paperTierUnitPrice('invitation', 1)).toBe(2000);
  });

  it('pelliculé ≠ PCB 300g (PCB + pelliculage A4 inclus)', () => {
    expect(resolveImpressionSfPaperPriceKey('Papier pelliculé mat', '320g', 'Impression numérique couleur')).toBe('pellicule320');
    expect(resolveImpressionSfPaperPriceKey('Papier pelliculé brillant', '370g', 'Impression numérique couleur')).toBe('pellicule370');
    expect(paperTierUnitPrice('pellicule320', 1)).toBe(2100);
    expect(paperTierUnitPrice('pcb350', 1)).toBe(1500);
    expect(paperTierUnitPrice('pellicule320', 1)).not.toBe(paperTierUnitPrice('pcb350', 1));
  });
});

describe('impressionSfFormatFactor', () => {
  it('applique les coefficients format (ratio + découpe/supplément Admin)', () => {
    // A6 = A4/4 + 50 découpe → facteur effectif 0.30 sur base 1000
    // A5 = A4/2 sans découpe → 0.50
    expect(impressionSfFormatFactor({ format: 'A6' })).toBe(0.3);
    expect(impressionSfFormatFactor({ format: 'A5' })).toBe(0.5);
    expect(impressionSfFormatFactor({ format: 'A3' })).toBe(2);
    expect(impressionSfFormatFactor({ format: 'B5' })).toBe(1);
  });
});

describe('computeImpressionSfPrice', () => {
  it('calcule Offset 80g N&B A4 recto qty 1', () => {
    const res = computeImpressionSfPrice({
      matiere: 'Standard / Offset',
      grammage: '80g',
      type: 'Impression numérique N&B',
      format: 'A4',
      face: 'Recto',
    }, 1);
    expect(res.calculable).toBe(true);
    expect(res.prixUnitaire).toBe(200);
    expect(res.priceKey).toBe('nb80');
  });

  it('double le prix en A3', () => {
    const res = computeImpressionSfPrice({
      matiere: 'PCB',
      grammage: '90g',
      type: 'Impression numérique couleur',
      format: 'A3',
      face: 'Recto',
    }, 1);
    expect(res.prixUnitaire).toBe(1600);
  });

  it('applique le protocole ANS RV', () => {
    const recto = computeImpressionSfPrice({
      matiere: 'PCB',
      grammage: '90g',
      type: 'Impression numérique couleur',
      format: 'A4',
      face: 'Recto',
    }, 1).prixUnitaire;
    const rv = computeImpressionSfPrice({
      matiere: 'PCB',
      grammage: '90g',
      type: 'Impression numérique couleur',
      format: 'A4',
      face: 'Recto-verso',
    }, 1).prixUnitaire;
    expect(rv).toBe(ansCalcRectoVersoPrice(recto));
    expect(rv).toBeGreaterThan(recto);
  });

  it('matière personnalisée rejoint le groupe prix toile (équivalence)', () => {
    const res = computeImpressionSfPrice({
      matiere: 'Matière personnalisée',
      grammage: 'Grammage personnalisé',
      type: 'Impression numérique couleur',
      format: 'A4',
      face: 'Recto',
    }, 1);
    expect(res.calculable).toBe(true);
    expect(res.priceKey).toBe('toile');
  });
});

describe('impressionSfVolumeRemiseRate', () => {
  it('aligne les paliers remise base ok.html', () => {
    expect(impressionSfVolumeRemiseRate(5)).toBe(0);
    expect(impressionSfVolumeRemiseRate(25)).toBe(0.1);
    expect(impressionSfVolumeRemiseRate(50)).toBe(0.18);
    expect(impressionSfVolumeRemiseRate(100)).toBe(0.25);
    expect(impressionSfVolumeRemiseRate(200)).toBe(0.33);
  });
});

describe('applyImpressionColorCoeff', () => {
  it('réduit de 30% pour N&B sur papier couché', () => {
    expect(applyImpressionColorCoeff(1000, 'Impression numérique N&B')).toBe(700);
    expect(applyImpressionColorCoeff(1000, 'Impression numérique couleur')).toBe(1000);
  });
});

describe('paperTierUnitPrice', () => {
  it('sélectionne le palier qty', () => {
    expect(paperTierUnitPrice('nb80', 1)).toBe(200);
    expect(paperTierUnitPrice('nb80', 100)).toBe(180);
    expect(paperTierUnitPrice('nb80', 5000)).toBe(120);
  });
});
