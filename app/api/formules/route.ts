export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { runApiHandler } from '@/lib/api-guard';
import { listFormules, parseFormuleListQuery } from '@/lib/server/modules/formules/formules.service';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('regles:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('formules GET', async () => {
    const payload = await listFormules(parseFormuleListQuery(req.nextUrl.searchParams));
    return NextResponse.json(payload);
  }, {
    fallbackResponse: {
      formulas: [],
      stats: { total: 0, active: 0 },
      source: 'html-catalogue',
      persisted: false,
    },
  });
}
