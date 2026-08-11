export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { exportDesignToExcel } from '@/lib/server/modules/direct-sale/pricing-tables.service';

export const GET = withAuthApi('design export', async () => {
  return NextResponse.json({ ok: true, data: { rows: await exportDesignToExcel() } });
}, { anyPermissions: ['config:view', 'tarifs:read'] });
