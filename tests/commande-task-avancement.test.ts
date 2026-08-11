import { describe, expect, it } from 'vitest';
import { computeCommandeAvancementFromTasks } from '@/lib/commande/commande-task-avancement';

describe('computeCommandeAvancementFromTasks', () => {
  it('retourne 0 et premier jalon si tout est à faire', () => {
    const r = computeCommandeAvancementFromTasks([
      { title: 'Graphisme', status: 'À faire', assigneeName: 'Aina' },
      { title: 'BAT', status: 'À faire', assigneeName: 'Aina' },
      { title: 'Impression', status: 'À faire', assigneeName: 'Hery' },
    ]);
    expect(r.avancement).toBe(0);
    expect(r.activeJalon).toBe('Validation client');
    expect(r.jalons[0]?.assigneeName).toBe('Aina');
  });

  it('BAT en cours → BAT envoyé (~20%)', () => {
    const r = computeCommandeAvancementFromTasks([
      { title: 'Graphisme', status: 'Terminée', assigneeName: 'Aina' },
      { title: 'BAT', status: 'En cours', assigneeName: 'Aina' },
      { title: 'Impression', status: 'À faire', assigneeName: 'Hery' },
    ]);
    expect(r.activeJalon).toBe('BAT envoyé');
    expect(r.avancement).toBeGreaterThanOrEqual(20);
    expect(r.avancement).toBeLessThan(50);
  });

  it('Impression terminée → En impression / 50%+', () => {
    const r = computeCommandeAvancementFromTasks([
      { title: 'Graphisme', status: 'Terminée' },
      { title: 'BAT', status: 'Terminée' },
      { title: 'Impression', status: 'Terminée' },
      { title: 'Façonnage', status: 'À faire' },
      { title: 'Contrôle qualité', status: 'À faire' },
      { title: 'Livraison', status: 'À faire' },
    ]);
    expect(r.avancement).toBeGreaterThanOrEqual(50);
    expect(r.activeJalon).toBe('Façonnage');
  });

  it('toutes tâches terminées → 100% Livrée', () => {
    const r = computeCommandeAvancementFromTasks([
      { title: 'Graphisme', status: 'Terminée' },
      { title: 'BAT', status: 'Terminée' },
      { title: 'Impression', status: 'Terminée' },
      { title: 'Façonnage', status: 'Terminée' },
      { title: 'Contrôle qualité', status: 'Terminée' },
      { title: 'Livraison', status: 'Terminée' },
    ]);
    expect(r.avancement).toBe(100);
    expect(r.activeJalon).toBe('Livrée');
    expect(r.suggestedStatut).toBe('Livré');
  });
});
