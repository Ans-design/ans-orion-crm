import { describe, expect, it } from 'vitest';
import {
  buildDefaultEstimationTempsConfig,
  buildProcessRatesForArticle,
  ensureRatesForArticles,
  inferProcessFamily,
} from '@/lib/data/estimation-temps-config';

describe('estimation-temps templates', () => {
  it('infère les familles catalogue', () => {
    expect(inferProcessFamily('Goodies', 'Assiette')).toBe('goodies');
    expect(inferProcessFamily('Carterie', 'Carte de visite')).toBe('carterie');
    expect(inferProcessFamily('Grand format', 'Acrylic / Plexiglas')).toBe('plaque');
    expect(inferProcessFamily('Flyer', 'Flyer A5')).toBe('flyer');
    expect(inferProcessFamily('Affiche', 'Affiche évènement')).toBe('affiche');
  });

  it('génère un parcours non vide par article', () => {
    const rates = buildProcessRatesForArticle({
      articleId: 'gd-tasse',
      articleLabel: 'Assiette',
      family: 'Goodies',
    });
    expect(rates.length).toBeGreaterThanOrEqual(3);
    expect(rates.every((r) => r.articleId === 'gd-tasse')).toBe(true);
    expect(rates.every((r) => r.rateValue >= 0)).toBe(true);
  });

  it('complète uniquement les articles sans opérations', () => {
    const existing = buildProcessRatesForArticle({
      articleId: 'cv-std',
      articleLabel: 'Carte de visite',
      family: 'Carterie',
    });
    const { rates, filledCount } = ensureRatesForArticles(existing, [
      { articleId: 'cv-std', articleLabel: 'Carte de visite', family: 'Carterie' },
      { articleId: 'gd-tasse', articleLabel: 'Assiette', family: 'Goodies' },
    ]);
    expect(filledCount).toBe(1);
    expect(rates.filter((r) => r.articleId === 'cv-std').length).toBe(existing.length);
    expect(rates.filter((r) => r.articleId === 'gd-tasse').length).toBeGreaterThan(0);
  });

  it('seed défaut couvre plusieurs familles', () => {
    const cfg = buildDefaultEstimationTempsConfig();
    const ids = new Set(cfg.rates.map((r) => r.articleId));
    expect(ids.has('cv-std')).toBe(true);
    expect(ids.has('gd-tasse')).toBe(true);
    expect(ids.has('bac-bache')).toBe(true);
    expect(cfg.rates.length).toBeGreaterThan(20);
  });
});
