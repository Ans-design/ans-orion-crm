export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { runApiHandler } from '@/lib/api-guard';
import { getDataManagementOverview } from '@/lib/server/modules/data-management/data-overview.service';

/** GET /api/admin/data-management/overview — volumes, activité, snapshots manquants */
export async function GET() {
  const auth = await requirePermission('settings:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('admin data-management overview GET', async () => {
    const overview = await getDataManagementOverview();
    return NextResponse.json({ ok: true, data: overview });
  }, {
    fallback: {
      data: {
        generatedAt: new Date().toISOString(),
        volumes: {
          clients: 0,
          clientsActifs: 0,
          devis: 0,
          commandes: 0,
          factures: 0,
          paiements: 0,
          livraisons: 0,
          stockItems: 0,
          productions: 0,
        },
        snapshots: { commandesSansPaymentSnapshot: 0, devisAcceptesSansLogistics: 0 },
        activity: { auditLast24h: 0, commandesLast7d: 0, paiementsLast7d: 0 },
        qualityTrend: [],
        anomaliesByModule: [],
      },
    },
  });
}
