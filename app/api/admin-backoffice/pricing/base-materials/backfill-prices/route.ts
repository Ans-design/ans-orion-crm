import { NextResponse } from 'next/server';
import { requireAnyPermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { backfillMissingBaseMaterialPrices } from '@/lib/server/modules/materials/material-price-backfill';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = await requireAnyPermission('tarifs:write');
  if ('error' in auth) return auth.error;

  try {
    const body = (await req.json().catch(() => ({}))) as { dryRun?: boolean };
    const dryRun = Boolean(body.dryRun);
    const result = await backfillMissingBaseMaterialPrices({ dryRun });
    return NextResponse.json({ ok: true, data: result, dryRun });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Backfill prix impossible') } },
      { status: 500 },
    );
  }
}
