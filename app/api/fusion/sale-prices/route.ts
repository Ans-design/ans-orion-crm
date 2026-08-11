export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { apiError } from '@/lib/api-response';
import {
  listSalePricesForAdmin,
  setSalePriceActive,
  updateCurrentPrice,
  resetRowToSource,
  resetModifiedRowsToSource,
  getCompareStats,
  exportPriceStoreJson,
  backfillSourcePrices,
  type SalePriceFilter,
} from '@/lib/services/fusion-admin-service';
import { parseBody } from '@/lib/validators/common';
import {
  fusionSalePricePatchSchema,
  fusionSalePricePostSchema,
  fusionSalePricePutSchema,
} from '@/lib/server/modules/fusion/fusion.validation';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;

  const sp = new URL(req.url).searchParams;
  const action = sp.get('action');

  if (action === 'compare') {
    try {
      await backfillSourcePrices();
      const stats = await getCompareStats();
      return NextResponse.json(stats);
    } catch (error) {
      return apiError(error instanceof Error ? error.message : 'Erreur comparaison', 503);
    }
  }

  if (action === 'export') {
    try {
      const data = await exportPriceStoreJson();
      return NextResponse.json(data);
    } catch (error) {
      return apiError(error instanceof Error ? error.message : 'Erreur export', 503);
    }
  }

  const q = sp.get('q') ?? undefined;
  const page = parseInt(sp.get('page') ?? '1', 10);
  const limit = parseInt(sp.get('limit') ?? '50', 10);
  const filter = (sp.get('filter') ?? 'all') as SalePriceFilter;

  try {
    await backfillSourcePrices();
    const result = await listSalePricesForAdmin({ q, page, limit, filter });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : 'Tables fusion absentes',
      503,
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePermission('config:edit_price');
  if ('error' in auth) return auth.error;

  try {
    const parsed = parseBody(fusionSalePricePatchSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);
    const { id, actif } = parsed.data;
    const updated = await setSalePriceActive(id, actif);
    return NextResponse.json({ ok: true, item: updated });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Erreur mise à jour prix', 500);
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requirePermission('config:edit_price');
  if ('error' in auth) return auth.error;

  try {
    const parsed = parseBody(fusionSalePricePutSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);
    const { id, salePriceAr, comment } = parsed.data;
    const updated = await updateCurrentPrice({
      id,
      salePriceAr: Math.round(salePriceAr),
      changedBy: auth.userName,
      comment,
    });
    return NextResponse.json({ ok: true, item: updated });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Erreur édition prix', 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('config:edit_price');
  if ('error' in auth) return auth.error;

  try {
    const parsed = parseBody(fusionSalePricePostSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    if (parsed.data.action === 'reset_row') {
      const updated = await resetRowToSource(parsed.data.id, auth.userName);
      return NextResponse.json({ ok: true, item: updated });
    }

    const count = await resetModifiedRowsToSource(auth.userName);
    return NextResponse.json({ ok: true, resetCount: count });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Erreur action prix', 500);
  }
}
