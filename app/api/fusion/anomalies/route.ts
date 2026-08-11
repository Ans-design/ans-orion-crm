export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { apiError } from '@/lib/api-response';
import { listAnomaliesForAdmin, setAnomalyResolved } from '@/lib/services/fusion-admin-service';
import { parseBody } from '@/lib/validators/common';
import { fusionAnomalyPatchSchema } from '@/lib/server/modules/fusion/fusion.validation';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;

  const showResolved = new URL(req.url).searchParams.get('resolved') === 'all';

  try {
    const anomalies = await listAnomaliesForAdmin(showResolved);
    return NextResponse.json({ anomalies });
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : 'Tables fusion absentes',
      503,
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePermission('config:edit_price');
  if ('error' in auth) return auth.error;

  try {
    const parsed = parseBody(fusionAnomalyPatchSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);
    const { id, resolved, decision } = parsed.data;
    const updated = await setAnomalyResolved(id, resolved, decision);
    return NextResponse.json({ ok: true, anomaly: updated });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Erreur mise à jour anomalie', 500);
  }
}
