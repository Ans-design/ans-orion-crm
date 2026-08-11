export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { listArticleTemplates } from '@/lib/services/article-template-service';

export async function GET() {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;

  const data = await listArticleTemplates();
  return NextResponse.json({
    templates: data.templates,
    total: data.templates.length,
    source: data.source,
  });
}
