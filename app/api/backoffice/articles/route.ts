export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { parseListParams } from '@/lib/api-list-params';
import { listBackofficeArticles, createBackofficeArticle } from '@/lib/services/backoffice-article-service';
import { logAudit } from '@/lib/audit';
import { safeErrorMessage } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { createBackofficeArticleSchema } from '@/lib/server/modules/backoffice/backoffice-articles.validation';
import { created } from '@/lib/server/http/api-response';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const { page, limit } = parseListParams(searchParams, { defaultLimit: 40, maxLimit: 100 });

  try {
    const data = await listBackofficeArticles({
      search: searchParams.get('search') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      family: searchParams.get('category') ?? searchParams.get('family') ?? undefined,
      page,
      limit,
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error('[backoffice/articles]', error);
    return NextResponse.json(
      { error: safeErrorMessage(error, 'Erreur chargement articles'), items: [], total: 0, page: 1, limit },
      { status: 503 },
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('config:edit_features');
  if ('error' in auth) return auth.error;

  try {
    const parsed = parseBody(createBackofficeArticleSchema, await req.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const article = await createBackofficeArticle(parsed.data);

    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'CREATE',
      entity: 'ArticlePricingProfile',
      entityId: article.articleId,
      entityLabel: article.articleLabel,
    });

    return created(article);
  } catch (error) {
    const msg = safeErrorMessage(error, 'Création article impossible');
    const status = msg.includes('déjà existant') ? 409 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
