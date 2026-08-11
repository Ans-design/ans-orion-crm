export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { getArticlesPriceTable } from '@/lib/server/modules/backoffice-v2/admin-backoffice.service';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const data = await getArticlesPriceTable({
      search: searchParams.get('search') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      family: searchParams.get('family') ?? undefined,
      limit: Number(searchParams.get('limit') ?? 300),
    });
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error('[admin-backoffice/articles-price-table]', error);
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Tableau prix indisponible'), code: 'TABLE_ERROR' } },
      { status: 503 },
    );
  }
}
