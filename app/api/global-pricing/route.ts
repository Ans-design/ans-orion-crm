export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { logAudit } from '@/lib/audit';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { DEFAULT_GLOBAL_PRICING } from '@/lib/data/global-pricing';
import { globalPricingUpdateSchema } from '@/lib/server/modules/pricing/pricing-api.validation';
import {
  getGlobalPricingConfig,
  updateGlobalPricingConfig,
} from '@/lib/server/modules/pricing/global-pricing.service';

export async function GET() {
  const auth = await requirePermission('tarifs:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('global-pricing GET', async () => {
    const config = await getGlobalPricingConfig();
    return NextResponse.json(config);
  }, { fallbackResponse: DEFAULT_GLOBAL_PRICING });
}

export async function PUT(req: NextRequest) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('global-pricing PUT', async (): Promise<Response> => {
    try {
      const parsed = parseBody(globalPricingUpdateSchema, await req.json());
      if (!parsed.ok) return apiError(parsed.error, 400);

      const merged = await updateGlobalPricingConfig(parsed.data, auth.userId!);

      await logAudit({
        userId: auth.userId,
        userName: auth.userName,
        action: 'UPDATE',
        entity: 'SystemConfig',
        entityLabel: 'Admin Prix global',
        details: merged,
      });

      return NextResponse.json(merged);
    } catch (error) {
      return apiError(safeErrorMessage(error, 'Erreur mise à jour prix global'), 500);
    }
  });
}
