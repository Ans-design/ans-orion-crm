export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission } from '@/lib/auth-utils';
import { listAllDirectSaleTiersFlat } from '@/lib/server/modules/direct-sale/direct-sale.service';

export async function GET(_req: NextRequest) {
  const auth = await requireAnyPermission('config:view', 'tarifs:read');
  if ('error' in auth) return auth.error;

  const rows = await listAllDirectSaleTiersFlat();
  return NextResponse.json({ ok: true, data: { rows } });
}
