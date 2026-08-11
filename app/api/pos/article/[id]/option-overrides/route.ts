export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { runApiHandler } from '@/lib/api-guard';
import { resolveParams } from '@/lib/api/route-params';
import { loadProductOptionOverridesForPos } from '@/lib/pricing/load-product-option-overrides';

export async function GET(
  _req: NextRequest,
  ctx: { params: { id: string } | Promise<{ id: string }> },
) {
  const { id: articleId } = await resolveParams(ctx.params);
  const auth = await requirePermission('pos:use');
  if ('error' in auth) return auth.error;

  if (!articleId) {
    return NextResponse.json({ error: 'id requis' }, { status: 400 });
  }

  return runApiHandler('pos/article option-overrides GET', async () => {
    const overrides = await loadProductOptionOverridesForPos(articleId);
    return NextResponse.json({ ok: true, articleId, overrides });
  }, {
    fallbackResponse: { ok: false, error: 'Overrides indisponibles' },
  });
}
