export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { createArticleFromTemplate } from '@/lib/services/article-template-service';
import { logAudit } from '@/lib/audit';
import { safeErrorMessage, apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { createArticleFromTemplateSchema } from '@/lib/validators/admin-config';
import { created } from '@/lib/server/http/api-response';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission('config:edit_features');
  if ('error' in auth) return auth.error;

  const { id: templateId } = await params;
  try {
    const parsed = parseBody(createArticleFromTemplateSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);
    const article = await createArticleFromTemplate(templateId, parsed.data);

    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'CREATE_FROM_TEMPLATE',
      entity: 'ArticlePricingProfile',
      entityId: article.articleId,
      entityLabel: article.articleLabel,
      details: { templateId },
    });

    return created({ article, templateId });
  } catch (error) {
    const msg = safeErrorMessage(error, 'Création depuis modèle impossible');
    const status = msg.includes('introuvable') ? 404 : msg.includes('déjà existant') ? 409 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
