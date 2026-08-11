export const dynamic = 'force-dynamic';



import { NextRequest, NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth-utils';

import { safeErrorMessage } from '@/lib/api-response';

import { prisma } from '@/lib/prisma';

import { publishAndSyncDirectSale } from '@/lib/server/modules/direct-sale/direct-sale.service';

import { syncDirectSaleArticleToPos } from '@/lib/services/direct-sale-pos-sync.service';

import { notifyAdminModuleMutation } from '@/lib/services/admin-data-sync.service';



type RouteParams = { params: Promise<{ id: string }> };



const POS_SYNC_FIELDS = new Set([

  'name',

  'category',

  'subCategory',

  'reference',

  'unitPrice',

  'blankUnitPrice',

  'marginPercent',

  'unit',

  'minQuantity',

  'maxQuantity',

  'materialKey',

  'materialName',

  'defaultFormat',

  'defaultSize',

  'defaultColor',

  'defaultPrintFace',

  'visiblePOS',

  'status',

  'sortOrder',

]);



export async function PATCH(req: NextRequest, { params }: RouteParams) {

  const auth = await requirePermission('tarifs:write');

  if ('error' in auth) return auth.error;



  try {

    const { id } = await params;

    const body = (await req.json()) as Record<string, unknown>;



    const data: Record<string, unknown> = {};

    const fields = [

      'name', 'category', 'subCategory', 'reference', 'description',

      'unitPrice', 'blankUnitPrice', 'marginPercent', 'unit', 'minQuantity', 'maxQuantity',

      'materialKey', 'materialName', 'defaultFormat', 'defaultSize', 'defaultColor', 'defaultPrintFace',

      'isCustomizable', 'requiresQuoteIfCustom', 'visiblePOS', 'status', 'sortOrder', 'excelId',

    ] as const;

    for (const f of fields) {

      if (body[f] !== undefined) data[f] = body[f];

    }



    if (body.action === 'publish') {

      if (Object.keys(data).length) {

        await prisma.directSaleArticle.update({ where: { id }, data: { ...data, updatedAt: new Date() } });

      }

      await publishAndSyncDirectSale(id, {

        userId: auth.userId,

        userName: auth.userName,

      });

      const published = await prisma.directSaleArticle.findUnique({ where: { id } });

      return NextResponse.json({ ok: true, data: published });

    }



    if (Object.keys(data).length) {

      await prisma.directSaleArticle.update({

        where: { id },

        data: { ...data, updatedAt: new Date() },

      });

    }



    const updated = await prisma.directSaleArticle.findUnique({ where: { id } });

    const touchedPosFields = Object.keys(data).some((k) => POS_SYNC_FIELDS.has(k));

    const shouldSync =

      body.action === 'sync'

      || (

        touchedPosFields

        && updated

        && (

          updated.status === 'published'

          || updated.status === 'archived'

          || data.visiblePOS === false

          || data.status === 'archived'

        )

      );



    if (shouldSync && updated) {

      await syncDirectSaleArticleToPos(id, {

        userId: auth.userId,

        userName: auth.userName,

        preferArticlePrice: true,

      });

      await notifyAdminModuleMutation('direct-sale-articles', {

        userId: auth.userId,

        userName: auth.userName,

        details: { articleId: id, action: body.action ?? 'patch' },

      });

    }



    return NextResponse.json({ ok: true, data: updated });

  } catch (error) {

    return NextResponse.json(

      { ok: false, error: { message: safeErrorMessage(error, 'Mise à jour impossible'), code: 'UPDATE_ERROR' } },

      { status: 500 },

    );

  }

}



export async function DELETE(_req: NextRequest, { params }: RouteParams) {

  const auth = await requirePermission('tarifs:write');

  if ('error' in auth) return auth.error;



  try {

    const { id } = await params;

    await prisma.directSaleArticle.update({

      where: { id },

      data: { status: 'archived', visiblePOS: false, updatedAt: new Date() },

    });

    // Retire / archive la carte Catalogue POS

    await syncDirectSaleArticleToPos(id, {

      userId: auth.userId,

      userName: auth.userName,

      preferArticlePrice: true,

    });

    await notifyAdminModuleMutation('direct-sale-articles', {

      userId: auth.userId,

      userName: auth.userName,

      details: { articleId: id, action: 'archive' },

    });

    return NextResponse.json({ ok: true, data: { archived: true } });

  } catch (error) {

    return NextResponse.json(

      { ok: false, error: { message: safeErrorMessage(error, 'Archivage impossible'), code: 'DELETE_ERROR' } },

      { status: 500 },

    );

  }

}


