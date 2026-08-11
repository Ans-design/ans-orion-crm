export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { posCatalogIndexService } from '@/lib/services/pos-catalog-index.service';

/** Compteurs catégories POS Commercial (= getPosCatalogue). */
export async function GET() {
  const auth = await requireAnyPermission('config:view', 'tarifs:read');
  if ('error' in auth) return auth.error;

  try {
    const data = await posCatalogIndexService.getIndexSnapshot();
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(e, 'Index catalogue indisponible') } },
      { status: 503 },
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAnyPermission('tarifs:write', 'config:edit_price', 'config:publish');
  if ('error' in auth) return auth.error;

  try {
    const body = (await req.json().catch(() => ({}))) as { action?: string };
    if (body.action === 'rebuild' || !body.action) {
      const data = await posCatalogIndexService.rebuildPOSCatalogIndex({
        userId: auth.userId,
        userName: auth.userName,
      });
      return NextResponse.json({ ok: true, data });
    }
    if (body.action === 'counters') {
      const categories = await posCatalogIndexService.recalculateCategoryCounters();
      return NextResponse.json({ ok: true, data: { categories } });
    }
    return NextResponse.json(
      { ok: false, error: { message: 'action inconnue', code: 'BAD_REQUEST' } },
      { status: 400 },
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(e, 'Rebuild index impossible') } },
      { status: 500 },
    );
  }
}
