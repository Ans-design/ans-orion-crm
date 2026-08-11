export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import {
  handlePricingTableList,
  handlePricingTablePost,
  pricingTableError,
} from '@/lib/server/modules/direct-sale/pricing-table-handlers';

export const GET = withAuthApi(
  'finishing list',
  async () => handlePricingTableList('finishing'),
  { anyPermissions: ['config:view', 'tarifs:read'] },
);

export const POST = withAuthApi(
  'finishing post',
  async (auth, req: NextRequest) => {
    try {
      const body = (await req.json()) as Record<string, unknown>;
      return handlePricingTablePost('finishing', body, auth);
    } catch (e) {
      return pricingTableError(e, 'Erreur finitions');
    }
  },
  { anyPermissions: ['tarifs:write'] },
);
