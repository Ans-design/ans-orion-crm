export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { created, ok } from '@/lib/server/http/api-response';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { parseBody } from '@/lib/server/validation/common';
import { supplierSchema } from '@/lib/validators/phase3';
import { nextSequenceSafe } from '@/lib/services/SequenceService';
import { containsQ } from '@/lib/prisma-filters';
import { assertSupplierUnique } from '@/lib/server/modules/suppliers/supplier-dedup.service';

export const GET = withAuthApi(
  'suppliers GET',
  async (_auth, req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const categorie = searchParams.get('categorie') || '';
    const statut = searchParams.get('statut') || '';

    const where: Record<string, unknown> = {};
    if (categorie) where.categorie = categorie;
    if (statut) where.statut = statut;
    if (q) {
      where.OR = [
        { name: containsQ(q) },
        { code: containsQ(q) },
        { contact: containsQ(q) },
      ];
    }

    const take = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 50)));
    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
      take,
      include: { _count: { select: { purchaseOrders: true } } },
    });

    return ok(suppliers);
  },
  { permission: 'fournisseurs:read' },
);

export async function POST(req: NextRequest) {
  return withAuthApi(
    'suppliers POST',
    async (_auth, request) => {
      const parsed = parseBody(supplierSchema, await request.json(), 'suppliers POST');
      if (!parsed.ok) return parsed.response;

      const { code: inputCode, ...data } = parsed.data;
      await assertSupplierUnique({ email: data.email, tel: data.tel });
      const code = inputCode || await nextSequenceSafe('FOU', () => prisma.supplier.count());

      const supplier = await prisma.supplier.create({
        data: { code, ...data, email: data.email || null },
      });
      return created(supplier);
    },
    { permission: 'fournisseurs:write' },
  )(req);
}
