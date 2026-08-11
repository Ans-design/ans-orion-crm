export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { getBackofficeCatalog } from '@/lib/server/modules/backoffice/backoffice.service';
import { getBackofficeSyncStatus } from '@/lib/server/modules/backoffice/backoffice-sync.service';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const [data, sync] = await Promise.all([
      getBackofficeCatalog({
        search: searchParams.get('search') ?? undefined,
        status: searchParams.get('status') ?? undefined,
        family: searchParams.get('family') ?? searchParams.get('category') ?? undefined,
        limit: Number(searchParams.get('limit') ?? 200),
      }),
      getBackofficeSyncStatus(),
    ]);
    return NextResponse.json({ ok: true, data: { ...data, sync } });
  } catch (error) {
    console.error('[backoffice/catalog]', error);
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Catalogue indisponible'), code: 'CATALOG_ERROR' } },
      { status: 503 },
    );
  }
}
