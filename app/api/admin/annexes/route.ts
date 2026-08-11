export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { annexCreateSchema, annexPostSchema } from '@/lib/server/modules/annexes/annexes.validation';
import { created } from '@/lib/server/http/api-response';
import {
  assignEmployeeToSite,
  createSiteAnnexe,
  getAnnexOverview,
  getAnnexSyncStats,
  getUserSiteFilter,
  listSiteAnnexes,
  setUserSiteFilter,
  transferStockToSite,
} from '@/lib/services/annex-service';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('commandes:read');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  if (searchParams.get('stats') === '1') {
    try {
      return NextResponse.json(await getAnnexSyncStats());
    } catch (error) {
      return apiError(safeErrorMessage(error, 'Erreur stats annexes'), 500);
    }
  }
  if (searchParams.get('overview') === '1') {
    try {
      return NextResponse.json(await getAnnexOverview());
    } catch (error) {
      return apiError(safeErrorMessage(error, 'Erreur overview'), 500);
    }
  }
  if (searchParams.get('filter') === '1' && auth.userId) {
    try {
      const activeSite = await getUserSiteFilter(auth.userId);
      return NextResponse.json({ activeSite });
    } catch (error) {
      return apiError(safeErrorMessage(error, 'Erreur filtre site'), 500);
    }
  }

  try {
    return NextResponse.json(await listSiteAnnexes());
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur annexes'), 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('settings:write');
  if ('error' in auth) return auth.error;

  try {
    const parsed = parseBody(annexPostSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    const body = parsed.data;

    if ('action' in body && body.action === 'set_filter' && auth.userId) {
      const site = body.activeSite ?? 'ALL';
      await setUserSiteFilter(auth.userId, site);
      return NextResponse.json({ activeSite: site });
    }

    if ('action' in body && body.action === 'assign_employee') {
      const emp = await assignEmployeeToSite(body.employeeId, body.site);
      return NextResponse.json(emp);
    }

    if ('action' in body && body.action === 'transfer_stock') {
      const result = await transferStockToSite(
        body.stockItemId,
        body.targetSite,
        body.quantity,
        auth.userName,
      );
      return NextResponse.json(result);
    }

    const createParsed = annexCreateSchema.safeParse(body);
    if (!createParsed.success) return apiError('Requête annexe invalide', 400);

    const annexe = await createSiteAnnexe(createParsed.data);
    return created(annexe);
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur annexes'), 500);
  }
}
