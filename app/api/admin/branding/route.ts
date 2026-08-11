export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { getBrandingConfig, updateBrandingConfig } from '@/lib/branding-config';
import { logAudit } from '@/lib/audit';
import { runApiHandler } from '@/lib/api-guard';
import { parseBody } from '@/lib/validators/common';
import { updateBrandingConfigSchema } from '@/lib/validators/admin-config';
import { apiError } from '@/lib/api-response';

export async function GET() {
  const auth = await requirePermission('settings:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('admin/branding GET', async () => {
    const config = await getBrandingConfig();
    return NextResponse.json(config);
  });
}

export async function PUT(req: NextRequest) {
  const auth = await requirePermission('settings:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('admin/branding PUT', async () => {
    const parsed = parseBody(updateBrandingConfigSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);
    const config = await updateBrandingConfig(parsed.data, auth.userId);

    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'UPDATE',
      entity: 'Branding',
      entityLabel: config.companyName,
    });

    return NextResponse.json(config);
  });
}
