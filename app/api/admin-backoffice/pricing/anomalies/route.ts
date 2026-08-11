export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { scanExtendedPricingAnomalies } from '@/lib/server/modules/pricing/pricing-anomaly.service';

export async function GET() {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;

  try {
    const rows = await scanExtendedPricingAnomalies();
    return NextResponse.json({ ok: true, data: { rows, total: rows.length } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, 'Anomalies indisponibles') },
      { status: 500 },
    );
  }
}
