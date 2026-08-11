export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { runApiHandler } from '@/lib/api-guard';
import { resolveParams } from '@/lib/api/route-params';
import { loadPublishedDynamicContext } from '@/lib/pricing/dynamic-pricing-context';
import { getArticleTiers } from '@/lib/server/modules/backoffice-v2/admin-backoffice-tiers.service';
import { isPrix2026LegacyEnabled } from '@/lib/pricing/prix-2026-legacy';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  ctx: { params: { id: string } | Promise<{ id: string }> },
) {
  const { id: articleId } = await resolveParams(ctx.params);
  const auth = await requirePermission('pos:use');
  if ('error' in auth) return auth.error;

  return runApiHandler('pos/article pricing-config GET', async () => {
    const [draft, published, basePrintingRows] = await Promise.all([
      getArticleTiers(articleId),
      loadPublishedDynamicContext(articleId),
      prisma.basePrintingPrice.findMany({
        where: { articleId, active: true, publicationStatus: 'published' },
        take: 5,
      }).catch(() => []),
    ]);
    if (!draft) {
      return NextResponse.json({ error: 'Article introuvable' }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      articleId,
      saleUnit: draft.article.saleUnit,
      qtyMin: draft.article.qtyMin,
      tierMode: draft.tierMode,
      prixBase: draft.article.prixBase,
      publicationStatus: draft.article.publicationStatus,
      publishedTiers: (published?.discountTiers ?? []).map((t) => ({
        id: t.id,
        minQty: t.minQty,
        maxQty: t.maxQty,
        unitPrice: t.unitPrice,
        discountPercent: t.discountPercent,
        active: t.active,
      })),
      isPublished: Boolean(published),
      usesPrix2026Legacy: isPrix2026LegacyEnabled(),
      basePrintingPublished: basePrintingRows.length,
      basePrintingPrices: basePrintingRows.map((r) => ({
        id: r.id,
        basePrice: r.basePrice,
        maxSafetyPrice: r.maxSafetyPrice,
        materialKey: r.materialKey,
        face: r.face,
      })),
    });
  }, { fallbackResponse: { ok: false, error: 'Config prix indisponible' } });
}
