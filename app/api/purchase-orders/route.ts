export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { created, ok } from '@/lib/server/http/api-response';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { parseBody } from '@/lib/server/validation/common';
import { purchaseOrderSchema } from '@/lib/validators/phase3';
import { nextSequenceSafe } from '@/lib/services/SequenceService';
import { stripPurchaseOrder } from '@/lib/auth/margin-access';

export const GET = withAuthApi(
  'purchase-orders GET',
  async (auth, req: NextRequest) => {
    const sp = new URL(req.url).searchParams;
    const statut = sp.get('statut') || '';
    const trash = sp.get('archived') === '1' || sp.get('trash') === '1';
    const where: Record<string, unknown> = { archived: trash };
    if (statut) where.statut = statut;

    const take = Math.min(100, Math.max(1, Number(sp.get('limit') || 50)));
    const orders = await prisma.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        supplier: { select: { id: true, name: true, code: true } },
        lignes: { orderBy: { sortOrder: 'asc' } },
      },
    });

    return ok(orders.map((order) => stripPurchaseOrder(order, auth.role)));
  },
  { permission: 'achats:read' },
);

export async function POST(req: NextRequest) {
  return withAuthApi(
    'purchase-orders POST',
    async (_auth, request) => {
      const parsed = parseBody(purchaseOrderSchema, await request.json(), 'purchase-orders POST');
      if (!parsed.ok) return parsed.response;

      const { supplierId, lignes, notes, expectedAt } = parsed.data;
      const numero = await nextSequenceSafe('ACH', () => prisma.purchaseOrder.count());

      let totalHT = 0;
      const lineData = lignes.map((l, i) => {
        const total = l.qty * l.unitCost;
        totalHT += total;
        return {
          stockItemId: l.stockItemId || null,
          label: l.label,
          qty: l.qty,
          purchaseUnit: l.purchaseUnit || null,
          conversionFactor: l.conversionFactor ?? null,
          unitCost: l.unitCost,
          total,
          sortOrder: i,
        };
      });

      const order = await prisma.purchaseOrder.create({
        data: {
          numero,
          supplierId,
          statut: 'Brouillon',
          totalHT,
          notes: notes || null,
          expectedAt: expectedAt ? new Date(expectedAt) : null,
          lignes: { create: lineData },
        },
        include: { supplier: true, lignes: true },
      });

      return created(order);
    },
    { permission: 'achats:write' },
  )(req);
}
