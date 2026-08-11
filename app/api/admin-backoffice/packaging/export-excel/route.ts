export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { exportPackagingExcelSheets } from '@/lib/server/modules/packaging/packaging-admin.service';

export const GET = withAuthApi(
  'packaging export excel',
  async () => {
    const sheets = await exportPackagingExcelSheets();
    return NextResponse.json({ ok: true, sheets });
  },
  { anyPermissions: ['config:view', 'tarifs:read'] },
);
