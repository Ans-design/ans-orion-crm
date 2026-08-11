export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { getFiscalConfig, updateFiscalConfig } from '@/lib/services/fiscal-config-service';
import { logAudit } from '@/lib/audit';
import { runApiHandler } from '@/lib/api-guard';
import { parseBody } from '@/lib/validators/common';
import { updateFiscalConfigSchema } from '@/lib/validators/admin-config';
import { apiError } from '@/lib/api-response';

export async function GET() {
  const auth = await requirePermission('settings:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('admin/fiscalite GET', async () => {
    return NextResponse.json(await getFiscalConfig());
  });
}

export async function PUT(req: NextRequest) {
  const auth = await requirePermission('settings:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('admin/fiscalite PUT', async () => {
    const parsed = parseBody(updateFiscalConfigSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);
    const config = await updateFiscalConfig(parsed.data, auth.userId);

    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'UPDATE',
      entity: 'Fiscalite',
      entityLabel: 'Configuration fiscale',
    });

    return NextResponse.json(config);
  });
}
