export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/server/http/errors';
import { ok } from '@/lib/server/http/api-response';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { parseBody } from '@/lib/server/validation/common';
import { supplierSchema } from '@/lib/validators/phase3';
import { resolveParams } from '@/lib/api/route-params';
import { assertSupplierUnique } from '@/lib/server/modules/suppliers/supplier-dedup.service';

export async function GET(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  return withAuthApi(
    'suppliers/[id] GET',
    async () => {
      const supplier = await prisma.supplier.findUnique({
        where: { id },
        include: {
          purchaseOrders: { orderBy: { createdAt: 'desc' }, take: 20 },
        },
      });
      if (!supplier) throw ApiError.notFound('Fournisseur introuvable');
      return ok(supplier);
    },
    { permission: 'fournisseurs:read' },
  )(req);
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  return withAuthApi(
    'suppliers/[id] PATCH',
    async (_auth, request) => {
      const parsed = parseBody(supplierSchema.partial(), await request.json(), 'suppliers/[id] PATCH');
      if (!parsed.ok) return parsed.response;

      await assertSupplierUnique({
        email: parsed.data.email,
        tel: parsed.data.tel,
        excludeId: id,
      });

      const supplier = await prisma.supplier.update({
        where: { id },
        data: { ...parsed.data, email: parsed.data.email || null },
      });
      return ok(supplier);
    },
    { permission: 'fournisseurs:write' },
  )(req);
}

export async function DELETE(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  return withAuthApi(
    'suppliers/[id] DELETE',
    async () => {
      const count = await prisma.purchaseOrder.count({ where: { supplierId: id } });
      if (count > 0) {
        throw ApiError.conflict('Fournisseur lié à des achats — désactivez-le plutôt');
      }

      await prisma.supplier.delete({ where: { id } });
      return ok({ success: true });
    },
    { permission: 'fournisseurs:write' },
  )(req);
}
