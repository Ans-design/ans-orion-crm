'use client';

import { useEffect, useState } from 'react';
import {
  COMMANDE_OPS_JOURNEY_EVENT,
  getOpsUniverseState,
  readCommandeOpsJourney,
  type CommandeOpsJourneySnapshot,
} from '@/lib/commande/commande-ops-journey-store';

export function useCommandeOpsJourney() {
  const [snapshot, setSnapshot] = useState<CommandeOpsJourneySnapshot>(() =>
    typeof window === 'undefined' ? readCommandeOpsJourney() : readCommandeOpsJourney(),
  );

  useEffect(() => {
    setSnapshot(readCommandeOpsJourney());
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<CommandeOpsJourneySnapshot>).detail;
      setSnapshot(detail ?? readCommandeOpsJourney());
    };
    window.addEventListener(COMMANDE_OPS_JOURNEY_EVENT, onChange);
    return () => window.removeEventListener(COMMANDE_OPS_JOURNEY_EVENT, onChange);
  }, []);

  return {
    snapshot,
    commandeId: snapshot.commandeId,
    activeUniverseId: snapshot.activeUniverseId,
    steps: snapshot.steps,
    isUniverseCurrent: (id: string) => getOpsUniverseState(id) === 'active',
    isUniverseDone: (id: string) => getOpsUniverseState(id) === 'done',
    universeState: (id: string) => getOpsUniverseState(id),
  };
}
