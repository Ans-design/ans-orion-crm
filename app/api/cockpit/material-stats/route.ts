export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission } from '@/lib/auth-utils';
import { getMaterialModuleKpis } from '@/lib/cockpit/material-kpis';
import { getCalendarModuleKpis } from '@/lib/cockpit/calendar-kpis';
import { withTimeout } from '@/lib/with-timeout';
import { runApiHandler } from '@/lib/api-guard';

const TIMEOUT_MS = 12_000;

export async function GET(req: NextRequest) {
  const auth = await requireAnyPermission('commandes:read', 'production:read', 'rapports:read');
  if ('error' in auth) return auth.error;

  const months = Math.min(12, Math.max(1, parseInt(req.nextUrl.searchParams.get('months') ?? '3', 10) || 3));

  return runApiHandler('cockpit/material-stats GET', async () => {
    const [material, calendar] = await withTimeout(
      Promise.all([getMaterialModuleKpis(months), getCalendarModuleKpis(months)]),
      TIMEOUT_MS,
      'cockpit_material',
    );
    // P0-23 : strip CA matière si pas finance/rapports
    const { hasPermission } = await import('@/lib/auth/permissions');
    let materialOut = material;
    if (
      material
      && !hasPermission(auth.role, 'finance:read')
      && !hasPermission(auth.role, 'rapports:read')
      && !hasPermission(auth.role, 'pos:view_margin')
    ) {
      materialOut = {
        ...material,
        caDevis: 0,
        caCommande: 0,
        prixForceCount: 0,
      };
    }
    return NextResponse.json({ material: materialOut, calendar, months });
  }, {
    fallbackResponse: { material: null, calendar: null, months },
  });
}
