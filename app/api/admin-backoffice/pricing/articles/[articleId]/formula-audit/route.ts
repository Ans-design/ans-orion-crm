export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { runApiHandler } from '@/lib/api-guard';
import { auditArticleFormula } from '@/lib/server/modules/pricing/pricing-formula-audit.service';
import { getBasePrintingForArticle } from '@/lib/server/modules/pricing/base-printing-price.service';
import { listBaseMaterials } from '@/lib/server/modules/pricing/base-material.repository';

export async function GET(_req: Request, { params }: { params: { articleId: string } }) {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;

  return runApiHandler('admin-backoffice/pricing/articles/formula-audit GET', async () => {
    const [formulaAudit, basePrinting, allMaterials] = await Promise.all([
      auditArticleFormula(params.articleId),
      getBasePrintingForArticle(params.articleId),
      listBaseMaterials({ activeOnly: true }),
    ]);
    return NextResponse.json({
      ok: true,
      data: { formulaAudit, basePrinting, materialsCount: allMaterials.rows.length },
    });
  }, { fallbackResponse: { ok: false, error: 'Audit formule indisponible' } });
}
