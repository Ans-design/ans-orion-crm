export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth-utils';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { createStockDirectSale, listStockDirectSales } from '@/lib/services/finance-adv-service';
import { created } from '@/lib/server/http/api-response';

const createSchema = z.object({
  stockItemId: z.string().optional().nullable(),
  label: z.string().min(1).max(200),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  clientId: z.string().optional().nullable(),
  mode: z.string().optional(),
  notes: z.string().max(500).optional().nullable(),
});

export async function GET() {
  const auth = await requirePermission('finance:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('finance/ventes-directes GET', async () => {
    return NextResponse.json(await listStockDirectSales());
  }, { fallbackResponse: [] });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('finance:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('finance/ventes-directes POST', async (): Promise<Response> => {
    const parsed = parseBody(createSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    const sale = await createStockDirectSale({
      ...parsed.data,
      soldByName: auth.userName,
    });
    return created(sale);
  });
}
