export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { withAuthApi, type AuthApiContext } from '@/lib/server/auth/with-auth-api';
import { syncAllDirectSalePricingToPos } from '@/lib/server/modules/direct-sale/pricing-tables.service';

export const POST = withAuthApi(
  'direct-sale sync-all',
  async (auth: AuthApiContext) => {
    const result = await syncAllDirectSalePricingToPos({
      userId: auth.userId,
      userName: auth.userName,
    });
    return NextResponse.json({ ok: true, data: result });
  },
  { anyPermissions: ['tarifs:write', 'config:edit_price'] },
);
