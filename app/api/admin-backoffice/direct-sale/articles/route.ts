export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { safeErrorMessage } from '@/lib/api-response';
import { listDirectSaleArticles } from '@/lib/server/modules/direct-sale/direct-sale.service';
import { syncAllDirectSalePricingToPos } from '@/lib/server/modules/direct-sale/pricing-tables.service';
import { slugifyDirectSaleName } from '@/lib/direct-sale/categories';
import { prisma } from '@/lib/prisma';
import { syncDirectSaleArticleToPos } from '@/lib/services/direct-sale-pos-sync.service';

export const GET = withAuthApi(
  'direct-sale articles list',
  async (_auth, req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const rows = await listDirectSaleArticles({
      status: searchParams.get('status') ?? undefined,
      category: searchParams.get('category') ?? undefined,
    });
    return NextResponse.json({ ok: true, data: { rows } });
  },
  { anyPermissions: ['config:view', 'tarifs:read'] },
);

export const POST = withAuthApi(
  'direct-sale articles create',
  async (auth, req: NextRequest) => {
    try {
      const body = (await req.json()) as Record<string, unknown>;
      if (body.action === 'sync-all') {
        const result = await syncAllDirectSalePricingToPos({
          userId: auth.userId,
          userName: auth.userName,
        });
        return NextResponse.json({ ok: true, data: result });
      }

      const name = String(body.name ?? '').trim();
      if (!name) {
        return NextResponse.json(
          { ok: false, error: { message: 'Nom article requis', code: 'VALIDATION' } },
          { status: 400 },
        );
      }

      const created = await prisma.directSaleArticle.create({
        data: {
          name,
          slug: slugifyDirectSaleName(name),
          category: String(body.category ?? 'petit_format'),
          subCategory: body.subCategory ? String(body.subCategory) : null,
          reference: body.reference ? String(body.reference) : null,
          description: body.description ? String(body.description) : null,
          unitPrice: Number(body.unitPrice) || 0,
          blankUnitPrice:
            body.blankUnitPrice != null && body.blankUnitPrice !== ''
              ? Number(body.blankUnitPrice)
              : null,
          marginPercent:
            body.marginPercent != null && body.marginPercent !== ''
              ? Number(body.marginPercent)
              : null,
          unit: String(body.unit ?? 'pièce'),
          minQuantity: Number(body.minQuantity) || 1,
          maxQuantity: body.maxQuantity != null ? Number(body.maxQuantity) : null,
          materialKey: body.materialKey ? String(body.materialKey) : null,
          materialName: body.materialName ? String(body.materialName) : null,
          defaultFormat: body.defaultFormat ? String(body.defaultFormat) : null,
          defaultSize: body.defaultSize ? String(body.defaultSize) : null,
          defaultColor: body.defaultColor ? String(body.defaultColor) : null,
          defaultPrintFace: body.defaultPrintFace ? String(body.defaultPrintFace) : null,
          isCustomizable: body.isCustomizable !== false,
          requiresQuoteIfCustom: body.requiresQuoteIfCustom !== false,
          visiblePOS: body.visiblePOS !== false,
          status: String(body.status ?? 'draft'),
        },
      });

      if (created.status === 'published') {
        await syncDirectSaleArticleToPos(created.id, {
          userId: auth.userId,
          userName: auth.userName,
        });
      }

      return NextResponse.json({ ok: true, data: created }, { status: 201 });
    } catch (error) {
      return NextResponse.json(
        { ok: false, error: { message: safeErrorMessage(error, 'Création impossible'), code: 'CREATE_ERROR' } },
        { status: 500 },
      );
    }
  },
  { anyPermissions: ['tarifs:write', 'config:edit_price'] },
);
