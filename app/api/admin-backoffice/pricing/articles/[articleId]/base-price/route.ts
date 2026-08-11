export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { runApiHandler } from '@/lib/api-guard';
import { safeErrorMessage } from '@/lib/api-response';
import { getBasePrintingForArticle } from '@/lib/server/modules/pricing/base-printing-price.service';
import { prisma } from '@/lib/prisma';

export async function GET(_req: Request, { params }: { params: { articleId: string } }) {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;

  return runApiHandler('admin-backoffice/pricing/articles/base-price GET', async () => {
    const rows = await getBasePrintingForArticle(params.articleId);
    return NextResponse.json({ ok: true, data: { rows } });
  }, { fallbackResponse: { ok: false, error: 'Prix base indisponible' } });
}

export async function PATCH(req: NextRequest, { params }: { params: { articleId: string } }) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;

  try {
    const body = (await req.json().catch(() => ({}))) as { publicationStatus?: string; basePrice?: number };

    const updateData: { publicationStatus?: string; basePrice?: number } = {};
    if (body.publicationStatus === 'published' || body.publicationStatus === 'draft') {
      updateData.publicationStatus = body.publicationStatus;
    }
    if (body.basePrice != null) updateData.basePrice = body.basePrice;

    const result = await prisma.basePrintingPrice.updateMany({
      where: { articleId: params.articleId, active: true },
      data: updateData,
    });

    if (body.basePrice != null && result.count === 0) {
      await prisma.basePrintingPrice.create({
        data: {
          articleId: params.articleId,
          materialKey: '',
          grammage: '',
          formatLabel: '',
          face: 'recto',
          saleUnit: 'pcs',
          referenceQty: 100,
          basePrice: body.basePrice,
          maxSafetyPrice: Math.round(body.basePrice * 1.15),
          active: true,
          publicationStatus: updateData.publicationStatus ?? 'draft',
        },
      });
    }

    return NextResponse.json({ ok: true, data: { updated: result.count } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, 'Mise à jour prix base impossible') },
      { status: 500 },
    );
  }
}
