import { describe, it, expect } from 'vitest';
import { COMMANDE_STATUTS, COMMANDE_PRODUCTION_STEPS } from '@/lib/data/commande-status';

describe('commande-status', () => {
  it('chaque jalon utilise un statut API valide', () => {
    for (const step of COMMANDE_PRODUCTION_STEPS) {
      expect(COMMANDE_STATUTS).toContain(step.statut);
    }
  });

  it('avancement des jalons est croissant', () => {
    const pcts = COMMANDE_PRODUCTION_STEPS.map((s) => s.avancement);
    for (let i = 1; i < pcts.length; i++) {
      expect(pcts[i]).toBeGreaterThan(pcts[i - 1]!);
    }
  });
});
