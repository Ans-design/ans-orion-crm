export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { exportGrandFormatToExcel } from '@/lib/server/modules/direct-sale/pricing-tables.service';

export const GET = withAuthApi('gf export file', async () => {
  return NextResponse.json({ ok: true, data: { rows: await exportGrandFormatToExcel() } });
}, { anyPermissions: ['config:view', 'tarifs:read'] });
