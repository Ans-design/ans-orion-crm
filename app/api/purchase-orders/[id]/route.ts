export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/server/http/errors';
import { ok } from '@/lib/server/http/api-response';
import { withAuthApi, type AuthApiContext } from '@/lib/server/auth/with-auth-api';
import { stripPurchaseOrder } from '@/lib/auth/margin-access';
import { parseBody } from '@/lib/server/validation/common';
import { patchPurchaseOrderSchema } from '@/lib/server/modules/purchase-orders/purchase-orders.validation';
import { receivePurchaseOrder } from '@/lib/services/purchase-order-service';
import { resolveParams } from '@/lib/api/route-params';

export async function GET(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  return withAuthApi(
    'purchase-orders/[id] GET',
    async (auth: AuthApiContext) => {
      const order = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: { supplier: true, lignes: { orderBy: { sortOrder: 'asc' } } },
      });
      if (!order) throw ApiError.notFound('Commande achat introuvable');
      return ok(stripPurchaseOrder(order, auth.role));
    },
    { permission: 'achats:read' },
  )(req);
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  return withAuthApi(
    'purchase-orders/[id] PATCH',
    async (auth: AuthApiContext, request) => {
      const parsed = parseBody(patchPurchaseOrderSchema, await request.json(), 'purchase-orders/[id] PATCH');
      if (!parsed.ok) return parsed.response;
      const { action, statut, notes } = parsed.data;

      if (action === 'receive') {
        const order = await receivePurchaseOrder(id, auth.userId, auth.userName);
        return ok(stripPurchaseOrder(order, auth.role));
      }

      const order = await prisma.purchaseOrder.update({
        where: { id },
        data: {
          ...(statut ? { statut } : {}),
          ...(notes !== undefined ? { notes } : {}),
        },
        include: { supplier: true, lignes: true },
      });
      return ok(stripPurchaseOrder(order, auth.role));
    },
    { permission: 'achats:write' },
  )(req);
}
