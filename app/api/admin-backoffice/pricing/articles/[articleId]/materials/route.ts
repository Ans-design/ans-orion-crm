export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { runApiHandler } from '@/lib/api-guard';
import { auditMaterialsUsedInPos } from '@/lib/server/modules/pricing/materials-used-pos.audit';
import { listBaseMaterials } from '@/lib/server/modules/pricing/base-material.repository';

export async function GET(_req: Request, { params }: { params: { articleId: string } }) {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;

  return runApiHandler('admin-backoffice/pricing/articles/materials GET', async () => {
    const [audit, baseResult] = await Promise.all([
      auditMaterialsUsedInPos(),
      listBaseMaterials({ activeOnly: true }),
    ]);

    const linked = audit.materials.filter(
      (m) => m.linkedArticles.includes(params.articleId) || m.linkedArticles.length === 0,
    );

    return NextResponse.json({
      ok: true,
      data: {
        linkedMaterials: linked,
        baseMaterials: baseResult.rows,
        fromFallback: baseResult.fromFallback,
        articleId: params.articleId,
      },
    });
  }, { fallbackResponse: { ok: false, error: 'Matières article indisponibles' } });
}
