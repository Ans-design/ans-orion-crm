export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { listConfigVersions } from '@/lib/services/admin-config';
import { runApiHandler } from '@/lib/api-guard';

export async function GET() {
  const auth = await requirePermission('config:audit_read');
  if ('error' in auth) return auth.error;

  return runApiHandler('admin-config/versions GET', async () => {
    const versions = await listConfigVersions(30);
    return NextResponse.json({ versions });
  }, { fallback: { versions: [] } });
}
