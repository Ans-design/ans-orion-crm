export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { listBackofficeAnomalies } from '@/lib/server/modules/backoffice/backoffice-anomaly.service';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;

  try {
    const limit = Number(new URL(req.url).searchParams.get('limit') ?? 500);
    const data = await listBackofficeAnomalies(limit);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error('[backoffice/anomalies]', error);
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Anomalies indisponibles'), code: 'ANOMALY_ERROR' } },
      { status: 503 },
    );
  }
}
