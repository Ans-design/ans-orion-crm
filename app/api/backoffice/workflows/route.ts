export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { getWorkflowBackofficePayload } from '@/lib/services/workflow-transition-service';
import {
  DEVIS_STATUTS,
  PRODUCTION_STATUTS,
  LIVRAISON_STATUTS,
  PAIEMENT_STATUTS,
} from '@/lib/data/status-registry';

export async function GET() {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;

  const payload = await getWorkflowBackofficePayload();

  return NextResponse.json({
    ...payload,
    registries: {
      devis: DEVIS_STATUTS,
      commande: payload.registries.commande,
      production: PRODUCTION_STATUTS,
      livraison: LIVRAISON_STATUTS,
      paiement: PAIEMENT_STATUTS,
    },
  });
}
