export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok } from '@/lib/server/http/api-response';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';

export const GET = withAuthApi(
  'stock/movements GET',
  async (_auth, req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const stockItemId = searchParams.get('stockItemId') || '';
    const limit = Math.min(200, Number(searchParams.get('limit') || 50));

    const where: Record<string, unknown> = {};
    if (stockItemId) where.stockItemId = stockItemId;

    const movements = await prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        stockItem: { select: { sku: true, label: true, unit: true, unitDisplay: true } },
      },
    });

    return ok(movements);
  },
  {
    permission: 'stock:read',
    fallbackResponse: { ok: true, data: [] },
  },
);
