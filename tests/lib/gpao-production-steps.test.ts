import { describe, expect, it } from 'vitest';
import { GPAO_COMMANDE_STEPS } from '@/lib/metier/gpao-production-steps';

describe('gpao-production-steps', () => {
  it('définit 6 étapes GPAO standard', () => {
    expect(GPAO_COMMANDE_STEPS).toHaveLength(6);
    const titles = GPAO_COMMANDE_STEPS.map((s) => s.title);
    expect(titles).toContain('Graphisme');
    expect(titles).toContain('BAT');
    expect(titles).toContain('Impression');
    expect(titles).toContain('Façonnage');
    expect(titles).toContain('Contrôle qualité');
    expect(titles).toContain('Livraison');
  });
});
