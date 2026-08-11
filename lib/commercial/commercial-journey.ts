import { COMMERCIAL_FLOW_ORDER } from '@/lib/navigation/sidebar-universes';

/** Étapes du parcours Commercial (hors réclamations = post-vente). */
export const COMMERCIAL_JOURNEY_CORE = [
  'clients',
  'pos',
  'panier',
  'devis',
  'commandes',
] as const;

export type CommercialJourneyStepId = (typeof COMMERCIAL_FLOW_ORDER)[number];
export type CommercialJourneyCoreStep = (typeof COMMERCIAL_JOURNEY_CORE)[number];

export type CommercialJourneyEvent =
  | 'client_selected'
  | 'cart_ready'
  | 'checkout_done'
  | 'devis_confirmed'
  | 'manual';

export type CommercialJourneySnapshot = {
  currentStep: CommercialJourneyStepId;
  furthestStep: CommercialJourneyCoreStep;
  clientId: string | null;
  cartCount: number;
  lastDevisId: string | null;
  lastCommandeId: string | null;
  updatedAt: string;
};

export type ResolveJourneyInput = {
  clientId?: string | null;
  cartCount?: number;
  devisId?: string | null;
  commandeId?: string | null;
  /** Étape manuelle / forcée (navigation) */
  preferredStep?: CommercialJourneyStepId | null;
};

const CORE_INDEX: Record<CommercialJourneyCoreStep, number> = {
  clients: 0,
  pos: 1,
  panier: 2,
  devis: 3,
  commandes: 4,
};

export function isCommercialJourneyStep(id: string): id is CommercialJourneyStepId {
  return (COMMERCIAL_FLOW_ORDER as readonly string[]).includes(id);
}

export function isCoreJourneyStep(id: string): id is CommercialJourneyCoreStep {
  return (COMMERCIAL_JOURNEY_CORE as readonly string[]).includes(id);
}

export function journeyStepIndex(id: CommercialJourneyStepId): number {
  return (COMMERCIAL_FLOW_ORDER as readonly string[]).indexOf(id);
}

export function coreStepIndex(id: CommercialJourneyCoreStep): number {
  return CORE_INDEX[id];
}

export function maxCoreStep(
  a: CommercialJourneyCoreStep,
  b: CommercialJourneyCoreStep,
): CommercialJourneyCoreStep {
  return CORE_INDEX[a] >= CORE_INDEX[b] ? a : b;
}

/**
 * Déduit l’étape courante du parcours à partir du contexte vente.
 * Priorité : commande > devis > panier > client > clients.
 */
export function resolveJourneyStep(input: ResolveJourneyInput): CommercialJourneyCoreStep {
  if (input.commandeId) return 'commandes';
  if (input.devisId) return 'devis';
  if ((input.cartCount ?? 0) > 0) return 'panier';
  if (input.clientId) return 'pos';
  return 'clients';
}

export function resolveFurthestStep(
  current: CommercialJourneyCoreStep,
  previous?: CommercialJourneyCoreStep | null,
): CommercialJourneyCoreStep {
  if (!previous) return current;
  return maxCoreStep(current, previous);
}

export function stepsDoneUpTo(furthest: CommercialJourneyCoreStep): Set<string> {
  const max = CORE_INDEX[furthest];
  return new Set(COMMERCIAL_JOURNEY_CORE.filter((s) => CORE_INDEX[s] < max));
}

export function emptyJourneySnapshot(): CommercialJourneySnapshot {
  return {
    currentStep: 'clients',
    furthestStep: 'clients',
    clientId: null,
    cartCount: 0,
    lastDevisId: null,
    lastCommandeId: null,
    updatedAt: new Date(0).toISOString(),
  };
}

export function applyJourneyEvent(
  prev: CommercialJourneySnapshot,
  event: CommercialJourneyEvent,
  patch: Partial<Pick<CommercialJourneySnapshot, 'clientId' | 'cartCount' | 'lastDevisId' | 'lastCommandeId'>> & {
    preferredStep?: CommercialJourneyStepId | null;
  } = {},
): CommercialJourneySnapshot {
  const { preferredStep, ...fields } = patch;
  const nextBase: CommercialJourneySnapshot = {
    ...prev,
    ...fields,
    updatedAt: new Date().toISOString(),
  };

  let current = resolveJourneyStep({
    clientId: nextBase.clientId,
    cartCount: nextBase.cartCount,
    devisId: nextBase.lastDevisId,
    commandeId: nextBase.lastCommandeId,
  });

  if (event === 'client_selected') current = 'pos';
  if (event === 'cart_ready') current = (nextBase.cartCount ?? 0) > 0 ? 'panier' : current;
  if (event === 'checkout_done') current = 'devis';
  if (event === 'devis_confirmed') current = 'commandes';

  /** Post-vente : réclamations (hors core) — commande considérée terminée. */
  if (event === 'manual' && preferredStep === 'reclamations') {
    return {
      ...nextBase,
      currentStep: 'reclamations',
      furthestStep: resolveFurthestStep(
        'commandes',
        isCoreJourneyStep(prev.furthestStep) ? prev.furthestStep : 'clients',
      ),
    };
  }

  if (event === 'manual' && preferredStep && isCoreJourneyStep(preferredStep)) {
    current = preferredStep;
  }

  const furthest = resolveFurthestStep(
    current,
    isCoreJourneyStep(prev.furthestStep) ? prev.furthestStep : 'clients',
  );

  return {
    ...nextBase,
    currentStep: current,
    furthestStep: furthest,
  };
}
