export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission } from '@/lib/auth-utils';
import { runApiHandler } from '@/lib/api-guard';
import { parseBody } from '@/lib/validators/common';
import { globalSearchQuerySchema } from '@/lib/server/modules/search/search.validation';
import { runGlobalSearch } from '@/lib/server/modules/search/search.service';

/** Recherche globale — clients, devis, commandes, factures, paiements, livraisons, employés, tickets, réclamations */
export async function GET(req: NextRequest) {
  const auth = await requireAnyPermission('clients:read', 'commandes:read', 'devis:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('search GET', async () => {
    const q = (req.nextUrl.searchParams.get('q') || '').trim();
    if (q.length < 2) return NextResponse.json({ results: [] });

    const parsed = globalSearchQuerySchema.safeParse({ q });
    if (!parsed.success) return NextResponse.json({ results: [] });

    const results = await runGlobalSearch(parsed.data.q);
    return NextResponse.json({ results });
  }, { fallbackResponse: { results: [] } });
}
