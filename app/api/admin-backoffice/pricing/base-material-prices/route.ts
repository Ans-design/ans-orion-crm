export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { listUnifiedMaterialPrices } from '@/lib/server/modules/pricing/base-material-price-unified.service';
import { archiveMisplacedFinishedProductsFromMaterials } from '@/lib/server/modules/materials/archive-misplaced-finished.service';

export async function GET(req: NextRequest) {
  const auth = await requireAnyPermission('config:view', 'tarifs:read');
  if ('error' in auth) return auth.error;

  try {
    const sp = req.nextUrl.searchParams;
    const data = await listUnifiedMaterialPrices({
      search: sp.get('search') ?? undefined,
      family: sp.get('family') ?? undefined,
      articleId: sp.get('articleId') ?? undefined,
      missingPrice: sp.get('missingPrice') === '1',
      linkedStock: sp.get('linkedStock') === '1' ? true : sp.get('linkedStock') === '0' ? false : undefined,
      archivedOnly: sp.get('archived') === '1',
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const msg = safeErrorMessage(error, 'Impossible de charger les matières');
    const schemaDrift =
      /blankSellPrice|does not exist|Unknown column|no such column/i.test(String(error)) ||
      /blankSellPrice|does not exist|Unknown column|no such column/i.test(msg);
    console.error('[base-material-prices GET]', error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: schemaDrift
            ? 'Schéma DB désynchronisé (colonne matières manquante). Exécutez `npx prisma db push` en local puis rechargez.'
            : msg,
          code: schemaDrift ? 'SCHEMA_DRIFT' : 'MATERIALS_LOAD_ERROR',
        },
        data: {
          rows: [],
          stats: { total: 0, missingPrice: 0, linkedStock: 0, published: 0, draft: 0, anomalies: 0 },
        },
      },
      { status: 500 },
    );
  }
}

/** Archive produits finis mal placés en matières (roll-up, stylo…) → Corbeille. */
export async function POST(req: NextRequest) {
  const auth = await requireAnyPermission('tarifs:write', 'config:edit_price', 'config:publish');
  if ('error' in auth) return auth.error;

  try {
    const body = (await req.json().catch(() => ({}))) as { action?: string };
    if (body.action !== 'archive-misplaced-finished') {
      return NextResponse.json(
        { ok: false, error: { message: 'Action inconnue', code: 'UNKNOWN_ACTION' } },
        { status: 400 },
      );
    }
    const result = await archiveMisplacedFinishedProductsFromMaterials({
      userId: 'userId' in auth ? auth.userId : undefined,
      userName: 'userName' in auth ? auth.userName : undefined,
    });
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: safeErrorMessage(error, 'Nettoyage matières impossible'),
          code: 'MATERIALS_CLEANUP_ERROR',
        },
      },
      { status: 500 },
    );
  }
}
