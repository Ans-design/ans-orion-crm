export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { getConfigHealth } from '@/lib/services/admin-config';
import { getDynamicPricingStats } from '@/lib/pricing/publish-dynamic-pricing';
import { safeErrorMessage } from '@/lib/api-response';

export async function GET() {
  const auth = await requirePermission('settings:write');
  if ('error' in auth) return auth.error;

  try {
    const [health, pricingStats] = await Promise.all([
      getConfigHealth().catch(() => null),
      getDynamicPricingStats().catch(() => null),
    ]);

    return NextResponse.json({
      ok: true,
      configStatus: health?.configStatus ?? 'unknown',
      pendingChanges: health?.pendingChanges ?? null,
      catalogDrift: health?.catalogDrift ?? null,
      pricingProfiles: pricingStats?.published ?? 0,
      lastPublishedAt: health?.lastPublishedAt ?? null,
      posSyncRecommended: (health?.catalogDrift?.totalDrift ?? 0) > 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, 'Sync status indisponible') },
      { status: 503 },
    );
  }
}
