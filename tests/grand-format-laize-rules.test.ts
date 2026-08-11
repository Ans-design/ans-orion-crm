import { describe, expect, it } from 'vitest';
import { evaluateBestLaizeCandidate, laizeChipToCm, evaluateLaizeUsage } from '@/lib/print/grand-format-laize-rules';

describe('grand-format-laize-rules', () => {
  it('125×300 cm sur laize 150 cm → facturé 150×300', () => {
    const ev = evaluateBestLaizeCandidate({
      longueurCm: 300,
      largeurCm: 125,
      availableLaizesCm: [150],
      quantity: 1,
      explicitLaizeCm: 150,
    });
    expect(ev.candidate?.surfaceReelleM2).toBe(3.75);
    expect(ev.candidate?.surfaceFacturableM2).toBe(4.5);
    expect(ev.candidate?.isNearLaizeRounded).toBe(true);
  });

  it('115×300 cm sur laize 150 cm → facturé 115×300', () => {
    const ev = evaluateBestLaizeCandidate({
      longueurCm: 300,
      largeurCm: 115,
      availableLaizesCm: [150],
      quantity: 1,
      explicitLaizeCm: 150,
    });
    expect(ev.candidate?.surfaceReelleM2).toBe(3.45);
    expect(ev.candidate?.surfaceFacturableM2).toBe(3.45);
    expect(ev.candidate?.isNearLaizeRounded).toBe(false);
  });

  it('150×300 cm exact laize → pas d\'arrondi spécial', () => {
    const ev = evaluateBestLaizeCandidate({
      longueurCm: 300,
      largeurCm: 150,
      availableLaizesCm: [150],
      quantity: 1,
      explicitLaizeCm: 150,
    });
    expect(ev.candidate?.exactLaizeMatch).toBe(true);
    expect(ev.candidate?.isNearLaizeRounded).toBe(false);
    expect(ev.candidate?.surfaceFacturableM2).toBe(4.5);
  });

  it('normalise 180cm → 1m80 (180 cm)', () => {
    expect(laizeChipToCm('1m80')).toBe(180);
    expect(laizeChipToCm('180cm')).toBe(180);
  });

  it('choisit la plus petite laize dans −30 cm (100×200)', () => {
    const ev = evaluateBestLaizeCandidate({
      longueurCm: 200,
      largeurCm: 100,
      availableLaizesCm: [100, 160, 320],
      quantity: 1,
    });
    expect(ev.candidate?.laizeCm).toBe(100);
    expect(ev.recommendedLaizeLabel).toBe('1m');
    expect(ev.candidate?.surfaceFacturableM2).toBe(2);
  });

  it('90×300 → moindre coût : laize 3m20 × 90 (2,88) plutôt que 1m × 300 (3,0)', () => {
    const ev = evaluateBestLaizeCandidate({
      longueurCm: 300,
      largeurCm: 90,
      availableLaizesCm: [100, 140, 160, 180, 240, 320],
      quantity: 1,
    });
    expect(ev.candidate?.laizeCm).toBe(320);
    expect(ev.candidate?.billableShortSideCm).toBe(320);
    expect(ev.candidate?.billableLongSideCm).toBe(90);
    expect(ev.candidate?.surfaceFacturableM2).toBe(2.88);
  });

  it('270×300 → laize 3m20 facturé 320×270', () => {
    const ev = evaluateBestLaizeCandidate({
      longueurCm: 300,
      largeurCm: 270,
      availableLaizesCm: [100, 140, 160, 180, 240, 320],
      quantity: 1,
    });
    expect(ev.candidate?.laizeCm).toBe(320);
    expect(ev.candidate?.billableShortSideCm).toBe(320);
    expect(ev.candidate?.billableLongSideCm).toBe(270);
    expect(ev.candidate?.surfaceFacturableM2).toBe(8.64);
  });

  it('85×95 laize 1 m → facture 100×85 (pas 100×95)', () => {
    const ev = evaluateBestLaizeCandidate({
      longueurCm: 95,
      largeurCm: 85,
      availableLaizesCm: [100, 140, 160, 180, 240, 320],
      quantity: 1,
      explicitLaizeCm: 100,
    });
    expect(ev.candidate?.laizeCm).toBe(100);
    expect(ev.candidate?.billableShortSideCm).toBe(100);
    expect(ev.candidate?.billableLongSideCm).toBe(85);
    expect(ev.candidate?.surfaceFacturableM2).toBe(0.85);
    expect(ev.candidate?.surfaceFacturableM2).toBeLessThan(0.95);
  });

  it('85×140 → préfère laize 140 (140×85) plutôt que 100×140 plus cher', () => {
    const ev = evaluateBestLaizeCandidate({
      longueurCm: 140,
      largeurCm: 85,
      availableLaizesCm: [100, 140, 160],
      quantity: 1,
    });
    expect(ev.candidate?.laizeCm).toBe(140);
    expect(ev.candidate?.billableShortSideCm).toBe(140);
    expect(ev.candidate?.billableLongSideCm).toBe(85);
    expect(ev.candidate?.surfaceFacturableM2).toBe(1.19);
  });
});

describe('evaluateLaizeUsage', () => {
  it('85×95 cm laize 1 m → consomme 0,85 m² (rotation moindre coût)', () => {
    const u = evaluateLaizeUsage({
      longueurM: 0.95,
      largeurM: 0.85,
      laizeM: 1,
      quantite: 1,
    });
    expect(u.orientation).toBe('rotation');
    expect(u.surfaceLaizeM2).toBe(0.85);
  });

  it('calcule surface laize en orientation normale', () => {
    const u = evaluateLaizeUsage({ longueurM: 2, largeurM: 1.2, laizeM: 1.6, quantite: 3 });
    expect(u.orientation).toBe('normal');
    expect(u.surfaceLaizeM2).toBe(9.6);
    expect(u.assemblageRequired).toBe(false);
  });

  it('calcule rotation quand largeur dépasse laize', () => {
    const u = evaluateLaizeUsage({ longueurM: 1.2, largeurM: 2, laizeM: 1.6, quantite: 1 });
    expect(u.orientation).toBe('rotation');
    expect(u.surfaceLaizeM2).toBe(3.2);
  });

  it('calcule assemblage quand aucune orientation ne convient', () => {
    const u = evaluateLaizeUsage({ longueurM: 4, largeurM: 2, laizeM: 1.6, quantite: 1 });
    expect(u.orientation).toBe('assemblage');
    expect(u.assemblageRequired).toBe(true);
    expect(u.strips).toBe(2);
  });
});
