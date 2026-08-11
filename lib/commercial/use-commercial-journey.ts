'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  stepsDoneUpTo,
  type CommercialJourneyEvent,
  type CommercialJourneySnapshot,
  type CommercialJourneyStepId,
  isCoreJourneyStep,
} from './commercial-journey';
import {
  COMMERCIAL_JOURNEY_EVENT,
  emitCommercialJourney,
  readCommercialJourney,
  setCommercialJourneyStep,
} from './commercial-journey-store';

export function useCommercialJourney() {
  const [snapshot, setSnapshot] = useState<CommercialJourneySnapshot>(() =>
    typeof window === 'undefined' ? readCommercialJourney() : readCommercialJourney(),
  );

  useEffect(() => {
    setSnapshot(readCommercialJourney());
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<CommercialJourneySnapshot>).detail;
      setSnapshot(detail ?? readCommercialJourney());
    };
    window.addEventListener(COMMERCIAL_JOURNEY_EVENT, onChange);
    return () => window.removeEventListener(COMMERCIAL_JOURNEY_EVENT, onChange);
  }, []);

  const emit = useCallback(
    (
      event: CommercialJourneyEvent,
      patch?: Parameters<typeof emitCommercialJourney>[1],
    ) => {
      const next = emitCommercialJourney(event, patch);
      setSnapshot(next);
      return next;
    },
    [],
  );

  const setStep = useCallback((step: CommercialJourneyStepId) => {
    const next = setCommercialJourneyStep(step);
    setSnapshot(next);
    return next;
  }, []);

  const doneIds = isCoreJourneyStep(snapshot.furthestStep)
    ? stepsDoneUpTo(snapshot.furthestStep)
    : new Set<string>();

  return {
    snapshot,
    currentStep: snapshot.currentStep,
    furthestStep: snapshot.furthestStep,
    doneIds,
    emit,
    setStep,
    isCurrent: (id: string) => snapshot.currentStep === id,
    isDone: (id: string) => {
      if (snapshot.currentStep === 'reclamations' && id === 'commandes') return true;
      return doneIds.has(id);
    },
  };
}
