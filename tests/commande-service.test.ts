import { describe, it, expect } from 'vitest';
import {
  buildCommandeArticleSummary,
  sumCommandeLignes,
} from '@/lib/services/commande-service';

describe('commande-service', () => {
  it('buildCommandeArticleSummary single line', () => {
    expect(buildCommandeArticleSummary(['Flyer A5'])).toBe('Flyer A5');
  });

  it('buildCommandeArticleSummary multi lines', () => {
    expect(buildCommandeArticleSummary(['Flyer A5', 'Carte visite', 'Affiche'])).toBe('Flyer A5 (+ 2 autres)');
  });

  it('sumCommandeLignes totals', () => {
    const r = sumCommandeLignes([
      { quantity: 100, totalLigne: 50000 },
      { quantity: 50, totalLigne: 25000 },
    ]);
    expect(r.qty).toBe(150);
    expect(r.total).toBe(75000);
  });
});
