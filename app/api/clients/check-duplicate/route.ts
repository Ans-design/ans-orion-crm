export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { runApiHandler } from '@/lib/api-guard';
import { checkClientDuplicates } from '@/lib/server/modules/clients/clients.service';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('clients:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('clients/check-duplicate GET', async () => {
    const { searchParams } = new URL(req.url);
    const result = await checkClientDuplicates({
      name: searchParams.get('name') || '',
      email: searchParams.get('email'),
      tel: searchParams.get('tel'),
      whatsapp: searchParams.get('whatsapp'),
    });
    return NextResponse.json(result);
  }, { fallback: { duplicates: [], hasDuplicates: false } });
}
