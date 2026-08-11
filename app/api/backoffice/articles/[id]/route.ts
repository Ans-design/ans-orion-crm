export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import {
  getBackofficeArticle,
  updateBackofficeArticle,
  deleteBackofficeArticle,
} from '@/lib/services/backoffice-article-service';
import { logAudit } from '@/lib/audit';
import { safeErrorMessage } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { updateBackofficeArticleSchema } from '@/lib/server/modules/backoffice/backoffice-articles.validation';
import { ok } from '@/lib/server/http/api-response';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;

  const { id } = await params;
  try {
    const article = await getBackofficeArticle(id);
    if (!article) {
      return NextResponse.json({ error: 'Article introuvable' }, { status: 404 });
    }
    return NextResponse.json({ article });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, 'Article indisponible') },
      { status: 503 },
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission('config:edit_features');
  if ('error' in auth) return auth.error;

  const { id } = await params;
  try {
    const parsed = parseBody(updateBackofficeArticleSchema, await req.json());
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const article = await updateBackofficeArticle(id, parsed.data);

    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'UPDATE',
      entity: 'ArticlePricingProfile',
      entityId: id,
      entityLabel: article.articleLabel,
      details: parsed.data,
    });

    const { invalidatePOSCache } = await import('@/lib/services/admin-to-commercial-sync.service');
    await invalidatePOSCache({ userId: auth.userId, userName: auth.userName });

    return ok(article);
  } catch (error) {
    const msg = safeErrorMessage(error, 'Mise à jour impossible');
    const status = msg.includes('introuvable') ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission('config:edit_features');
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const hard = req.nextUrl.searchParams.get('hard') === 'true';

  try {
    const result = await deleteBackofficeArticle(id, { hard });

    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: hard ? 'DELETE' : 'ARCHIVE',
      entity: 'ArticlePricingProfile',
      entityId: id,
      entityLabel: id,
      details: { mode: result.mode },
    });

    const { invalidatePOSCache } = await import('@/lib/services/admin-to-commercial-sync.service');
    await invalidatePOSCache({ userId: auth.userId, userName: auth.userName });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const msg = safeErrorMessage(error, 'Suppression impossible');
    const status = msg.includes('introuvable') ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
