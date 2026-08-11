export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { listChipArticles } from '@/lib/server/modules/backoffice-v2/admin-backoffice-chips.service';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const data = await listChipArticles({
      search: searchParams.get('q') ?? searchParams.get('search') ?? undefined,
      family: searchParams.get('family') ?? searchParams.get('category') ?? undefined,
      category: searchParams.get('category') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      includeInactive: searchParams.get('includeInactive') === '1',
      onlyWithChips: searchParams.get('onlyWithChips') === '1',
      onlyWithAnomalies: searchParams.get('onlyWithAnomalies') === '1',
    });
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Articles indisponibles'), code: 'ARTICLES_ERROR' } },
      { status: 503 },
    );
  }
}
