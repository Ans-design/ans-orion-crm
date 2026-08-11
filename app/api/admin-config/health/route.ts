export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { getConfigHealth } from '@/lib/services/admin-config';
import { runApiHandler } from '@/lib/api-guard';

export async function GET() {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;

  return runApiHandler('admin-config/health GET', async () => {
    const health = await getConfigHealth();
    return NextResponse.json(health);
  }, { fallback: { ok: false, catalogDrift: { totalDrift: 0 } } });
}
