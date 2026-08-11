export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { publishMaterialPriceRow } from '@/lib/server/modules/pricing/base-material-price.service';
import { resolveParams } from '@/lib/api/route-params';
import { propagatePricingToCommercialNow } from '@/lib/services/commercial-live-propagation.service';
import { jsonWithLiveDomains } from '@/lib/live/live-response';

export async function POST(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;
  const { id } = await resolveParams(ctx.params);

  try {
    const body = (await req.json().catch(() => ({}))) as { basePrintingPriceId?: string };
    const result = await publishMaterialPriceRow(id, body.basePrintingPriceId ?? null, {
      userId: auth.userId,
      userName: auth.userName,
    });
    const propagation = await propagatePricingToCommercialNow({ rebuildIndex: true });
    return jsonWithLiveDomains(
      { ok: true, data: result, commercialPropagated: true },
      propagation.domains,
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, 'Publication impossible') },
      { status: 500 },
    );
  }
}
