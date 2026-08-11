'use client';

import {
  applyJourneyEvent,
  emptyJourneySnapshot,
  type CommercialJourneyEvent,
  type CommercialJourneySnapshot,
  type CommercialJourneyStepId,
} from './commercial-journey';

const STORAGE_KEY = 'ans_commercial_journey_v1';
export const COMMERCIAL_JOURNEY_EVENT = 'commercialJourneyChanged';

export function readCommercialJourney(): CommercialJourneySnapshot {
  if (typeof window === 'undefined') return emptyJourneySnapshot();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyJourneySnapshot();
    const parsed = JSON.parse(raw) as CommercialJourneySnapshot;
    return { ...emptyJourneySnapshot(), ...parsed };
  } catch {
    return emptyJourneySnapshot();
  }
}

function writeCommercialJourney(snapshot: CommercialJourneySnapshot): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  window.dispatchEvent(new CustomEvent(COMMERCIAL_JOURNEY_EVENT, { detail: snapshot }));
}

export function emitCommercialJourney(
  event: CommercialJourneyEvent,
  patch: Partial<
    Pick<CommercialJourneySnapshot, 'clientId' | 'cartCount' | 'lastDevisId' | 'lastCommandeId'>
  > & { preferredStep?: CommercialJourneyStepId | null } = {},
): CommercialJourneySnapshot {
  const prev = readCommercialJourney();
  const next = applyJourneyEvent(prev, event, patch);
  writeCommercialJourney(next);
  return next;
}

export function setCommercialJourneyStep(step: CommercialJourneyStepId): CommercialJourneySnapshot {
  return emitCommercialJourney('manual', { preferredStep: step });
}

export function syncCommercialJourneyFromContext(input: {
  clientId?: string | null;
  cartCount?: number;
  devisId?: string | null;
  commandeId?: string | null;
}): CommercialJourneySnapshot {
  return emitCommercialJourney('manual', {
    clientId: input.clientId ?? readCommercialJourney().clientId,
    cartCount: input.cartCount ?? readCommercialJourney().cartCount,
    lastDevisId: input.devisId ?? readCommercialJourney().lastDevisId,
    lastCommandeId: input.commandeId ?? readCommercialJourney().lastCommandeId,
  });
}
