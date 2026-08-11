export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { runApiHandler } from '@/lib/api-guard';
import { searchClients } from '@/lib/server/modules/clients/clients.service';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('clients:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('clients search', async () => {
    const q = new URL(req.url).searchParams.get('q') ?? '';
    const clients = await searchClients(q);
    return NextResponse.json({ clients });
  }, { fallback: { clients: [] } });
}
