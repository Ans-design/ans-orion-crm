export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { exportFinishingToExcel } from '@/lib/server/modules/direct-sale/pricing-tables.service';

export const GET = withAuthApi(
  'finishing export',
  async () => {
    const rows = await exportFinishingToExcel();
    return NextResponse.json({ ok: true, data: { rows } });
  },
  { anyPermissions: ['config:view', 'tarifs:read'] },
);
