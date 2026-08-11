import { describe, expect, it } from 'vitest';
import {
  COMMANDE_STATUT_TRANSITIONS,
  getAllowedStatutTransitions,
  validateCommandeStatutTransition,
  type CommandeStatutTransitionMap,
} from '@/lib/workflow/commande-workflow';

describe('workflow transitions map override', () => {
  it('utilise la map personnalisée pour les transitions autorisées', () => {
    const custom: CommandeStatutTransitionMap = {
      ...COMMANDE_STATUT_TRANSITIONS,
      'À planifier': ['En production'],
      'En production': [],
      'En attente stock': [],
      'En finition': [],
      'Prête': [],
      'Livré': [],
      'En retard': [],
      'Suspendu': [],
      'Annulée': [],
    };

    expect(getAllowedStatutTransitions('À planifier', custom)).toEqual(['En production']);
    expect(getAllowedStatutTransitions('À planifier')).toContain('En attente stock');
  });

  it('rejette une transition absente de la map DB', () => {
    const custom: CommandeStatutTransitionMap = {
      ...COMMANDE_STATUT_TRANSITIONS,
      'À planifier': [],
      'En attente stock': [],
      'En production': [],
      'En finition': [],
      'Prête': [],
      'Livré': [],
      'En retard': [],
      'Suspendu': [],
      'Annulée': [],
    };

    const r = validateCommandeStatutTransition(
      'À planifier',
      'En production',
      {
        statut: 'À planifier',
        avancement: 10,
        total: 100,
        acompte: 100,
        reste: 0,
        requiredAcompteRatio: 0.3,
        batValides: 1,
        totalBat: 1,
        fichiersCount: 1,
        hasDossierProduction: true,
        tachesCount: 1,
        qualiteValidee: false,
        incidentsOuverts: 0,
        stockReady: true,
        stockBlockers: [],
      },
      { transitionsMap: custom },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('INVALID_TRANSITION');
  });

  it('bloque Prête → En finition sans force (stock déjà consommé)', () => {
    const ctx = {
      statut: 'Prête' as const,
      avancement: 90,
      total: 100_000,
      acompte: 100_000,
      reste: 0,
      requiredAcompteRatio: 0.3,
      batValides: 1,
      totalBat: 1,
      fichiersCount: 1,
      hasDossierProduction: true,
      tachesCount: 1,
      qualiteValidee: true,
      incidentsOuverts: 0,
      stockReady: true,
      stockBlockers: [] as string[],
    };
    const blocked = validateCommandeStatutTransition('Prête', 'En finition', ctx);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.code).toBe('STOCK_DEJA_CONSOMME');

    const forced = validateCommandeStatutTransition('Prête', 'En finition', ctx, { force: true });
    expect(forced.ok).toBe(true);
  });
});
