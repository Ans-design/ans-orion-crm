import { describe, expect, it } from 'vitest';
import {
  applyJourneyEvent,
  emptyJourneySnapshot,
  resolveJourneyStep,
  stepsDoneUpTo,
} from '@/lib/commercial/commercial-journey';
import {
  COMMANDE_LIFE_RAIL,
  commandeListBucket,
  isLifeRailStepUnlocked,
  resolveLifeRailStepId,
} from '@/lib/commande/commande-life-rail';
import {
  buildCommandeUniverseFlowSteps,
  resolveActiveUniverseStepIndex,
} from '@/lib/commande/commande-universe-flow';
import { COMMANDE_HUB_UNIVERSE_ORDER } from '@/lib/navigation/sidebar-universes';
import {
  canFinalizeCommandeRetourClient,
  isCommandeLivreeLabel,
  toCommandeStatutLabel,
} from '@/lib/data/commande-statut-display';
import { normalizeCommandeStatut } from '@/lib/data/status-registry';
import { buildFinalizeRedirect } from '@/lib/services/commande-finalize-service';

describe('commercial-journey', () => {
  it('résout l’étape selon le contexte', () => {
    expect(resolveJourneyStep({})).toBe('clients');
    expect(resolveJourneyStep({ clientId: 'c1' })).toBe('pos');
    expect(resolveJourneyStep({ clientId: 'c1', cartCount: 2 })).toBe('panier');
    expect(resolveJourneyStep({ devisId: 'd1' })).toBe('devis');
    expect(resolveJourneyStep({ commandeId: 'cmd1' })).toBe('commandes');
  });

  it('applique les événements du parcours', () => {
    let snap = emptyJourneySnapshot();
    snap = applyJourneyEvent(snap, 'client_selected', { clientId: 'c1' });
    expect(snap.currentStep).toBe('pos');
    expect(snap.furthestStep).toBe('pos');

    snap = applyJourneyEvent(snap, 'cart_ready', { cartCount: 1 });
    expect(snap.currentStep).toBe('panier');

    snap = applyJourneyEvent(snap, 'checkout_done', { cartCount: 0, lastDevisId: 'd1' });
    expect(snap.currentStep).toBe('devis');

    snap = applyJourneyEvent(snap, 'devis_confirmed', { lastCommandeId: 'cmd1' });
    expect(snap.currentStep).toBe('commandes');
    expect(stepsDoneUpTo(snap.furthestStep).has('devis')).toBe(true);
    expect(stepsDoneUpTo(snap.furthestStep).has('panier')).toBe(true);
    expect(stepsDoneUpTo(snap.furthestStep).has('pos')).toBe(true);

    snap = applyJourneyEvent(snap, 'manual', {
      lastCommandeId: 'cmd1',
      preferredStep: 'reclamations',
    });
    expect(snap.currentStep).toBe('reclamations');
    expect(snap.furthestStep).toBe('commandes');
  });
});

describe('commande-life-rail', () => {
  it('expose Emballage dans le rail', () => {
    expect(COMMANDE_LIFE_RAIL.some((s) => s.id === 'emballage')).toBe(true);
    expect(COMMANDE_LIFE_RAIL.map((s) => s.id)).toEqual([
      'creee',
      'acompte',
      'bat',
      'impression',
      'faconnage',
      'emballage',
      'prete',
      'livree',
    ]);
  });

  it('résout l’étape active selon le statut', () => {
    expect(
      resolveLifeRailStepId({
        statut: 'À planifier',
        avancement: 5,
        acompte: 0,
        total: 1000,
        reste: 1000,
        batValides: 0,
        totalBat: 0,
        hasDossierProduction: false,
      }),
    ).toBe('acompte');

    expect(
      resolveLifeRailStepId({
        statut: 'En finition',
        avancement: 85,
        acompte: 500,
        total: 1000,
        reste: 500,
        batValides: 1,
        totalBat: 1,
        hasDossierProduction: true,
        qualiteValidee: true,
      }),
    ).toBe('emballage');

    expect(
      resolveLifeRailStepId({
        statut: 'Livré',
        avancement: 100,
        acompte: 1000,
        total: 1000,
        reste: 0,
        batValides: 1,
        totalBat: 1,
        hasDossierProduction: true,
        hasLivraison: true,
      }),
    ).toBe('livree');
  });

  it('débloque le rail selon les tâches personnel (Impression finie → Façonnage)', () => {
    const base = {
      statut: 'En production',
      avancement: 50,
      acompte: 500,
      total: 1000,
      reste: 500,
      batValides: 1,
      totalBat: 1,
      hasDossierProduction: true,
    };
    expect(
      resolveLifeRailStepId({
        ...base,
        tasks: [
          { title: 'Graphisme', status: 'Terminée' },
          { title: 'BAT', status: 'Terminée' },
          { title: 'Impression', status: 'Terminée' },
          { title: 'Façonnage', status: 'À faire' },
          { title: 'Contrôle qualité', status: 'À faire' },
        ],
      }),
    ).toBe('faconnage');

    expect(
      resolveLifeRailStepId({
        ...base,
        tasks: [
          { title: 'Graphisme', status: 'Terminée' },
          { title: 'BAT', status: 'Terminée' },
          { title: 'Impression', status: 'Terminée' },
          { title: 'Façonnage', status: 'Terminée' },
          { title: 'Contrôle qualité', status: 'À faire' },
        ],
      }),
    ).toBe('emballage');

    expect(isLifeRailStepUnlocked('impression', 'faconnage')).toBe(true);
    expect(isLifeRailStepUnlocked('faconnage', 'faconnage')).toBe(true);
    expect(isLifeRailStepUnlocked('emballage', 'faconnage')).toBe(false);
    expect(isLifeRailStepUnlocked('prete', 'faconnage')).toBe(false);
  });

  it('classe les commandes en files', () => {
    expect(commandeListBucket('À planifier')).toBe('a_traiter');
    expect(commandeListBucket('En production')).toBe('en_cours');
    expect(commandeListBucket('Prête')).toBe('pretes');
    expect(commandeListBucket('Livré')).toBe('livrees');
  });
});

describe('commande-statut-display', () => {
  it('mappe les clés Prisma vers libellés métier', () => {
    expect(toCommandeStatutLabel('Livre')).toBe('Livré');
    expect(toCommandeStatutLabel('Livree')).toBe('Livré');
    expect(toCommandeStatutLabel('Livrée')).toBe('Livré');
    expect(toCommandeStatutLabel('Prete')).toBe('Prête');
    expect(isCommandeLivreeLabel('Livre')).toBe(true);
    expect(isCommandeLivreeLabel('Livree')).toBe(true);
    expect(normalizeCommandeStatut('Livre')).toBe('Livré');
    expect(normalizeCommandeStatut('Livree')).toBe('Livré');
    expect(canFinalizeCommandeRetourClient('Prête')).toBe(true);
    expect(canFinalizeCommandeRetourClient('Livré')).toBe(true);
    expect(canFinalizeCommandeRetourClient('En production')).toBe(false);
    expect(canFinalizeCommandeRetourClient('En finition')).toBe(false);
  });

  it('rail + bucket acceptent Livree / Livrée', () => {
    expect(
      resolveLifeRailStepId({
        statut: 'Livree',
        avancement: 100,
        acompte: 1000,
        total: 1000,
        reste: 0,
        batValides: 1,
        totalBat: 1,
        hasDossierProduction: true,
      }),
    ).toBe('livree');
    expect(commandeListBucket('Livrée')).toBe('livrees');
    expect(commandeListBucket('Livree')).toBe('livrees');
  });
});

describe('commande-finalize-redirect', () => {
  it('construit les URLs de bascule SAV / Talk', () => {
    expect(buildFinalizeRedirect({ commandeId: 'c1' })).toBe('/commandes/c1');
    expect(buildFinalizeRedirect({ commandeId: 'c1', talkId: 't1' })).toBe('/messagerie?conv=t1');
    expect(buildFinalizeRedirect({ commandeId: 'c1', reclamationId: 'r1' })).toBe(
      '/reclamations?commande=c1&id=r1',
    );
    expect(
      buildFinalizeRedirect({ commandeId: 'c1', reclamationId: 'r1', talkId: 't1' }),
    ).toBe('/reclamations?commande=c1&id=r1&talk=t1');
  });
});

describe('commande-ops-universe (sidebar auto)', () => {
  it('suit le rail de vie pour l’univers actif', () => {
    expect(
      COMMANDE_HUB_UNIVERSE_ORDER[
        resolveActiveUniverseStepIndex({
          commandeId: 'c1',
          statut: 'En production',
          reste: 0,
          lifeRailStepId: 'impression',
        })
      ],
    ).toBe('production');

    expect(
      COMMANDE_HUB_UNIVERSE_ORDER[
        resolveActiveUniverseStepIndex({
          commandeId: 'c1',
          statut: 'En finition',
          reste: 0,
          lifeRailStepId: 'emballage',
        })
      ],
    ).toBe('communication');

    expect(
      COMMANDE_HUB_UNIVERSE_ORDER[
        resolveActiveUniverseStepIndex({
          commandeId: 'c1',
          statut: 'Prête',
          reste: 0,
          lifeRailStepId: 'prete',
        })
      ],
    ).toBe('logistique');
  });

  it('marque les univers précédents comme done', () => {
    const steps = buildCommandeUniverseFlowSteps({
      commandeId: 'c1',
      statut: 'Prête',
      reste: 200,
      lifeRailStepId: 'prete',
      hasDossierGpaO: true,
    });
    expect(steps.find((s) => s.id === 'production')?.state).toBe('done');
    expect(steps.find((s) => s.id === 'logistique')?.state).toBe('active');
    expect(steps.find((s) => s.id === 'finance')?.state).toBe('upcoming');
  });

  it('Production pointe vers Planning Gantt lié à la commande', () => {
    const steps = buildCommandeUniverseFlowSteps({
      commandeId: 'c1',
      statut: 'En production',
      reste: 0,
      lifeRailStepId: 'impression',
    });
    expect(steps.find((s) => s.id === 'production')?.href).toBe('/production/dossiers?commande=c1');
  });
});
