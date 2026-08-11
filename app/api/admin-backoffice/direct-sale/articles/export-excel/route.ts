export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { exportDirectSaleArticlesToExcelRows } from '@/lib/server/modules/direct-sale/direct-sale.service';

export const GET = withAuthApi(
  'direct-sale export-excel',
  async () => {
    const rows = await exportDirectSaleArticlesToExcelRows();
    return NextResponse.json({ ok: true, data: { rows } });
  },
  { anyPermissions: ['config:view', 'tarifs:read'] },
);
