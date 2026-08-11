export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { canViewMargin, stripStockUnitCost } from '@/lib/auth/margin-access';
import { created, ok } from '@/lib/server/http/api-response';
import { withAuthApi, type AuthApiContext } from '@/lib/server/auth/with-auth-api';
import { parseBody } from '@/lib/server/validation/common';
import { createStockItemSchema } from '@/lib/server/modules/stock/stock.validation';
import { createStockItem, listStockItems, parseStockListQuery } from '@/lib/server/modules/stock/stock.service';
import { propagateStockToCommercialNow } from '@/lib/services/commercial-live-propagation.service';
import { attachLiveDomains } from '@/lib/live/live-response';

const EMPTY_STOCK_LIST = { items: [], stats: { total: 0, critical: 0, outOfStock: 0 } };

export const GET = withAuthApi(
  'stock GET',
  async (auth: AuthApiContext, req: NextRequest) => {
    const result = await listStockItems(parseStockListQuery(req.nextUrl.searchParams));
    if (!canViewMargin(auth.role) && Array.isArray(result.items)) {
      result.items = result.items.map((item) =>
        stripStockUnitCost(item as { unitCost?: number | null }, auth.role),
      ) as typeof result.items;
    }
    return ok(result);
  },
  {
    permission: 'production:read',
    fallbackResponse: { ok: true, data: EMPTY_STOCK_LIST },
  },
);

export async function POST(req: NextRequest) {
  return withAuthApi(
    'stock POST',
    async (auth: AuthApiContext, request) => {
      const parsed = parseBody(createStockItemSchema, await request.json(), 'stock POST');
      if (!parsed.ok) return parsed.response;

      const item = await createStockItem(parsed.data, {
        userId: auth.userId,
        userName: auth.userName,
      });
      const rebuildIndex = Boolean(
        parsed.data.linkMaterial
        || parsed.data.unitCost
        || parsed.data.basePrintPrice
        || parsed.data.impactsPrice
        || parsed.data.visiblePos,
      );
      const { domains } = await propagateStockToCommercialNow({ rebuildIndex });
      return attachLiveDomains(
        created(stripStockUnitCost(item as { unitCost?: number | null }, auth.role)),
        domains,
      );
    },
    { permission: 'production:write' },
  )(req);
}
