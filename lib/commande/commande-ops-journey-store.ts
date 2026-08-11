'use client';

import {
  buildCommandeUniverseFlowSteps,
  type CommandeUniverseFlowInput,
  type CommandeUniverseFlowStep,
  type CommandeUniverseStepId,
} from '@/lib/commande/commande-universe-flow';
import { ORION_NAV_BADGES_REFRESH_EVENT } from '@/lib/navigation/use-nav-badges';

export const COMMANDE_OPS_JOURNEY_EVENT = 'commandeOpsJourneyChanged';

export type CommandeOpsJourneySnapshot = {
  commandeId: string | null;
  numero: string | null;
  statut: string | null;
  activeUniverseId: CommandeUniverseStepId | null;
  steps: CommandeUniverseFlowStep[];
  updatedAt: string;
};

const empty: CommandeOpsJourneySnapshot = {
  commandeId: null,
  numero: null,
  statut: null,
  activeUniverseId: null,
  steps: [],
  updatedAt: new Date(0).toISOString(),
};

let memory: CommandeOpsJourneySnapshot = empty;

export function readCommandeOpsJourney(): CommandeOpsJourneySnapshot {
  return memory;
}

function publish(next: CommandeOpsJourneySnapshot, refreshBadges: boolean) {
  memory = next;
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(COMMANDE_OPS_JOURNEY_EVENT, { detail: next }));
  if (refreshBadges) {
    window.dispatchEvent(new CustomEvent(ORION_NAV_BADGES_REFRESH_EVENT));
  }
}

/** Met à jour le parcours univers (Stock → Studio → Prod → …) pour la commande active. */
export function syncCommandeOpsJourney(
  input: CommandeUniverseFlowInput & { numero?: string | null },
  opts?: { refreshBadges?: boolean },
): CommandeOpsJourneySnapshot {
  const steps = buildCommandeUniverseFlowSteps(input);
  const active = steps.find((s) => s.state === 'active') ?? null;
  const next: CommandeOpsJourneySnapshot = {
    commandeId: input.commandeId,
    numero: input.numero ?? null,
    statut: input.statut,
    activeUniverseId: active?.id ?? null,
    steps,
    updatedAt: new Date().toISOString(),
  };
  publish(next, opts?.refreshBadges !== false);
  return next;
}

export function clearCommandeOpsJourney(): void {
  publish(empty, false);
}

export function getOpsUniverseState(
  universeId: string,
): 'done' | 'active' | 'upcoming' | null {
  const step = memory.steps.find((s) => s.id === universeId);
  return step?.state ?? null;
}
