import { describe, expect, it } from 'vitest';
import {
  hasActiveSlotOnDay,
  isActivePlanningStatut,
  isInCommandePool,
} from '@/lib/planning/planning-pool';

describe('planning board — créneaux actifs seulement', () => {
  it('Terminé / Annulé ne sont pas actifs sur le Gantt', () => {
    expect(isActivePlanningStatut('Planifié')).toBe(true);
    expect(isActivePlanningStatut('En cours')).toBe(true);
    expect(isActivePlanningStatut('En attente')).toBe(true);
    expect(isActivePlanningStatut('Terminé')).toBe(false);
    expect(isActivePlanningStatut('Terminée')).toBe(false);
    expect(isActivePlanningStatut('Annulé')).toBe(false);
  });

  it('un créneau Terminé libère le pool (plus de présence Gantt du jour)', () => {
    const day = new Date(2026, 7, 10, 12, 0, 0);
    const slots = [
      {
        id: 's1',
        commandeId: 'c1',
        machine: 'Impression',
        startAt: new Date(2026, 7, 10, 9, 0, 0).toISOString(),
        endAt: new Date(2026, 7, 10, 12, 0, 0).toISOString(),
        statut: 'Terminé',
      },
    ];
    expect(hasActiveSlotOnDay(slots, 'c1', day)).toBe(false);
    // Durée encore restante → peut revenir au pool pour la suite
    expect(
      isInCommandePool({
        commandeId: 'c1',
        statut: 'En production',
        slots,
        day,
        remainingMin: 60,
      }),
    ).toBe(true);
  });

  it('un créneau En cours garde la commande hors du pool', () => {
    const day = new Date(2026, 7, 10, 12, 0, 0);
    const slots = [
      {
        id: 's1',
        commandeId: 'c1',
        machine: 'Impression',
        startAt: new Date(2026, 7, 10, 9, 0, 0).toISOString(),
        endAt: new Date(2026, 7, 10, 12, 0, 0).toISOString(),
        statut: 'En cours',
      },
    ];
    expect(hasActiveSlotOnDay(slots, 'c1', day)).toBe(true);
    expect(
      isInCommandePool({
        commandeId: 'c1',
        statut: 'En production',
        slots,
        day,
        remainingMin: 60,
      }),
    ).toBe(false);
  });
});
