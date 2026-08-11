'use client';

import { useMemo } from 'react';
import { FlowContextBanner } from '@/components/flow/flow-context-banner';
import { getNextAction, type NextAction, type NextActionContext } from '@/lib/flow/next-action';

const PROCESS_LABELS: Record<NextActionContext['entity'], string> = {
  devis: 'Devis → Commande',
  commande: 'Commande → Production → Livraison → Facture',
  bat: 'Studio & BAT',
  production: 'Production GPAO',
  stock: 'Stock & Achats',
  livraison: 'Logistique & Livraison',
  facture: 'Finance & Facturation',
  article: 'Catalogue & POS',
  client: 'Client → Devis → Commande',
};

type Props = {
  entity: NextActionContext['entity'];
  status: string;
  entityId?: string;
  processStep?: string;
  impactedModules?: string[];
  nextAction?: NextAction | null;
  className?: string;
};

/** Bannière flow métier prête à l'emploi (4 questions ultraprompt). */
export function FlowPageBanner({
  entity,
  status,
  entityId,
  processStep,
  impactedModules,
  nextAction: nextActionOverride,
  className,
}: Props) {
  const nextAction = useMemo(() => {
    if (nextActionOverride !== undefined) return nextActionOverride;
    return getNextAction({ entity, status, entityId });
  }, [entity, status, entityId, nextActionOverride]);

  return (
    <FlowContextBanner
      processStep={processStep ?? PROCESS_LABELS[entity]}
      status={status}
      nextAction={nextAction}
      impactedModules={impactedModules}
      className={className}
    />
  );
}
