export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { publishAllDraftMaterialPrices } from '@/lib/server/modules/pricing/base-material-price.service';
import { syncPricingMaterialsToPos } from '@/lib/server/modules/pricing/pricing-pos-sync.service';
import { propagatePricingToCommercialNow } from '@/lib/services/commercial-live-propagation.service';
import { jsonWithLiveDomains } from '@/lib/live/live-response';

export async function POST(_req: NextRequest) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;

  try {
    const result = await publishAllDraftMaterialPrices(auth.userId);
    const sync = await syncPricingMaterialsToPos({ publish: false, userId: auth.userId }).catch(() => null);
    const propagation = await propagatePricingToCommercialNow({ rebuildIndex: true });
    return jsonWithLiveDomains(
      { ok: true, data: { ...result, sync, commercialPropagated: true } },
      propagation.domains,
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, 'Publication globale impossible') },
      { status: 500 },
    );
  }
}
