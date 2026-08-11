export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { logAudit } from '@/lib/audit';
import { patchArticlePriceTableRow } from '@/lib/server/modules/backoffice-v2/admin-backoffice.service';
import { patchArticlePriceRowSchema } from '@/lib/server/modules/backoffice-v2/admin-backoffice.validation';

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;

  const { id } = await params;
  try {
    const parsed = parseBody(patchArticlePriceRowSchema, await req.json());
    if (!parsed.ok) {
      return NextResponse.json(
        { ok: false, error: { message: parsed.error, code: 'VALIDATION' } },
        { status: 400 },
      );
    }

    const article = await patchArticlePriceTableRow(id, parsed.data);
    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'UPDATE',
      entity: 'ArticlePricingProfile',
      entityId: id,
      entityLabel: article.articleLabel,
      newValue: parsed.data,
    });

    return NextResponse.json({ ok: true, data: article });
  } catch (error) {
    console.error('[admin-backoffice/articles-price-table PATCH]', error);
    return NextResponse.json(
      { ok: false, error: { message: safeErrorMessage(error, 'Sauvegarde impossible'), code: 'PATCH_ERROR' } },
      { status: 400 },
    );
  }
}
