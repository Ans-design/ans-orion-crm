export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { canViewMargin, stripCoutsRevientRow } from '@/lib/auth/margin-access';
import { getCoutsRevient } from '@/lib/services/finance-adv-service';
import { runApiHandler } from '@/lib/api-guard';

export async function GET(req: Request) {
  const auth = await requirePermission('finance:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('finance/couts-revient GET', async () => {
    const items = await getCoutsRevient();
    if (canViewMargin(auth.role)) return NextResponse.json(items);
    return NextResponse.json(items.map((row) => stripCoutsRevientRow(row, auth.role)));
  }, { fallbackResponse: [] });
}
