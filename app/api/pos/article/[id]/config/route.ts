export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { resolveCatalogueItemFromDb } from '@/lib/services/catalogue-service';
import { runApiHandler } from '@/lib/api-guard';
import { resolveParams } from '@/lib/api/route-params';

export async function GET(
  _req: NextRequest,
  ctx: { params: { id: string } | Promise<{ id: string }> },
) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('pos:use');
  if ('error' in auth) return auth.error;

  const articleId = id;
  if (!articleId) {
    return NextResponse.json({ error: 'id requis' }, { status: 400 });
  }

  return runApiHandler('pos/article config GET', async () => {
    const item = await resolveCatalogueItemFromDb(articleId);
    if (!item) {
      return NextResponse.json({ error: 'Article introuvable' }, { status: 404 });
    }
    return NextResponse.json({ item, config: item, source: 'unified' });
  }, {
    fallbackResponse: { error: 'Config POS indisponible' },
  });
}
