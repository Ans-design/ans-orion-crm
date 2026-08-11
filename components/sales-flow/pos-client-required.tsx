'use client';

import type { ReactNode } from 'react';
import { useSalesClient } from '@/lib/sales-flow/use-sales-client';
import { PosClientGate } from './pos-client-gate';
import { usePosOrderFlow } from './pos-order-flow-provider';
import { LoadingState } from '@/components/ui/loading-state';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

/** Bloque le contenu POS tant qu'aucun client n'est sélectionné */
export function PosClientRequired({ children, fallback }: Props) {
  const { hydrated, hasClient } = useSalesClient();
  const { openClientSearch } = usePosOrderFlow();

  if (!hydrated) {
    return fallback ?? <LoadingState message="Chargement…" size="sm" />;
  }

  if (!hasClient) {
    return <PosClientGate onStartOrder={openClientSearch} />;
  }

  return <>{children}</>;
}
