export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { getPosCatalogue } from '@/lib/services/catalogue-service';
import { runApiHandler } from '@/lib/api-guard';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('pos:use');
  if ('error' in auth) return auth.error;

  const role = auth.role;
  const countOnly = req.nextUrl.searchParams.get('count') === '1';

  return runApiHandler('pos/catalogue GET', async () => {
    const data = await getPosCatalogue(role);
    if (countOnly) {
      const items = Array.isArray(data) ? data : (data as { items?: unknown[] })?.items ?? [];
      return NextResponse.json({ count: items.length });
    }
    return NextResponse.json(data);
  }, {
    fallbackResponse: countOnly ? { count: 0 } : { items: [], categories: [] },
  });
}
