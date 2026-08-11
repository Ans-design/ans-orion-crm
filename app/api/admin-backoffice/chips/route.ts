export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { getGlobalChips } from '@/lib/server/modules/backoffice-v2/admin-backoffice-chips.service';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const data = await getGlobalChips({
      search: searchParams.get('search') ?? undefined,
      articleId: searchParams.get('article') ?? undefined,
      block: searchParams.get('block') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      impact: searchParams.get('impact') ?? undefined,
      includeArchived: searchParams.get('archived') === '1',
      limit: Number(searchParams.get('limit') ?? 200),
    });
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Chips indisponibles'), code: 'CHIPS_ERROR' } },
      { status: 503 },
    );
  }
}
