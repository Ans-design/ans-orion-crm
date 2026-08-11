import { describe, expect, it } from 'vitest';
import { computeEnterpriseHealth } from '@/lib/cockpit/enterprise-health';

describe('enterprise-health', () => {
  it('score global élevé quand tout va bien', () => {
    const h = computeEnterpriseHealth({
      devisEnAttente: 2,
      tauxConversion: 60,
      dossiersBloques: 0,
      cmdRetard: 0,
      batEnAttente: 1,
      stockCritique: 0,
      impayesClients: 0,
      margeReellePct: 35,
      rhRetards: 0,
      tachesBloquees: 0,
      livraisonsEnCours: 3,
    });
    expect(h.globalScore).toBeGreaterThanOrEqual(75);
    expect(h.domains).toHaveLength(6);
  });

  it('pénalise impayés et dossiers bloqués', () => {
    const h = computeEnterpriseHealth({
      devisEnAttente: 15,
      tauxConversion: 20,
      dossiersBloques: 3,
      cmdRetard: 4,
      batEnAttente: 8,
      stockCritique: 5,
      impayesClients: 5_000_000,
      margeReellePct: 10,
      rhRetards: 5,
      tachesBloquees: 2,
      livraisonsEnCours: 20,
    });
    expect(h.globalScore).toBeLessThan(70);
    expect(h.summary).toContain('Attention');
  });
});
