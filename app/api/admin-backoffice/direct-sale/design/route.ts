export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { handlePricingTableList, handlePricingTablePost, pricingTableError } from '@/lib/server/modules/direct-sale/pricing-table-handlers';

export const GET = withAuthApi('design list', async () => handlePricingTableList('design'), { anyPermissions: ['config:view', 'tarifs:read'] });
export const POST = withAuthApi('design post', async (auth, req: NextRequest) => {
  try {
    return handlePricingTablePost('design', (await req.json()) as Record<string, unknown>, auth);
  } catch (e) { return pricingTableError(e, 'Erreur design'); }
}, { anyPermissions: ['tarifs:write'] });
