export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { handlePricingTableList, handlePricingTablePost, pricingTableError } from '@/lib/server/modules/direct-sale/pricing-table-handlers';

export const GET = withAuthApi('grand-format list', async () => handlePricingTableList('grand-format'), { anyPermissions: ['config:view', 'tarifs:read'] });
export const POST = withAuthApi('grand-format post', async (auth, req: NextRequest) => {
  try {
    return handlePricingTablePost('grand-format', (await req.json()) as Record<string, unknown>, auth);
  } catch (e) { return pricingTableError(e, 'Erreur grand format'); }
}, { anyPermissions: ['tarifs:write'] });
