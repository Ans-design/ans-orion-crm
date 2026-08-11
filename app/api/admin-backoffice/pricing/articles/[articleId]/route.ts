export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { runApiHandler } from '@/lib/api-guard';
import { getPricingArticleDetail } from '@/lib/server/modules/backoffice-v2/admin-backoffice-pricing.service';

type RouteParams = { params: Promise<{ articleId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;

  const { articleId } = await params;
  return runApiHandler(`admin-backoffice/pricing/articles/${articleId} GET`, async () => {
    const data = await getPricingArticleDetail(articleId);
    if (!data) {
      return NextResponse.json({ ok: false, error: { message: 'Article introuvable', code: 'NOT_FOUND' } }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data });
  }, { fallbackResponse: { ok: false, error: 'Détail prix indisponible' } });
}
