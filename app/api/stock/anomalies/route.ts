export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { apiError } from '@/lib/api-response';
import { detectStockItemAnomalies } from '@/lib/server/modules/stock/stock-anomaly.service';
import { stockRepository } from '@/lib/server/modules/stock/stock.repository';
import { asStockExtended } from '@/lib/server/modules/stock/stock.types';

export const GET = withAuthApi(
  'stock anomalies GET',
  async (_auth, req: NextRequest) => {
    const stockItemId = req.nextUrl.searchParams.get('stockItemId');
    if (stockItemId) {
      const item = await stockRepository.findById(stockItemId);
      if (!item) return apiError('Article introuvable', 404);
      return NextResponse.json({ ok: true, data: detectStockItemAnomalies(asStockExtended(item)) });
    }

    const take = Math.min(200, Math.max(1, Number(req.nextUrl.searchParams.get('limit') || 100)));
    const items = await stockRepository.findMany({ actif: true, archived: false }, { take });
    const all = items.flatMap((item) =>
      detectStockItemAnomalies(asStockExtended(item)).map((a) => ({
        ...a,
        stockItemId: item.id,
        sku: item.sku,
        label: item.label,
      })),
    );
    return NextResponse.json({ ok: true, data: all, count: all.length, take });
  },
  { permission: 'production:read' },
);
