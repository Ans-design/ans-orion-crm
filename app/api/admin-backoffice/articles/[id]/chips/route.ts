export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { getArticleChips } from '@/lib/server/modules/backoffice-v2/admin-backoffice-chips.service';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;

  const { id } = await params;
  try {
    const data = await getArticleChips(id);
    if (!data) {
      return NextResponse.json(
        { ok: false, error: { message: 'Article introuvable', code: 'NOT_FOUND' } },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Variables indisponibles'), code: 'CHIPS_ERROR' } },
      { status: 503 },
    );
  }
}
