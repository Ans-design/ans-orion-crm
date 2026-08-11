export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { rollbackConfigVersionSchema } from '@/lib/validators/admin-config';
import { rollbackToVersion } from '@/lib/services/admin-config';

export async function POST(req: NextRequest) {
  const auth = await requirePermission('config:rollback');
  if ('error' in auth) return auth.error;

  try {
    const parsed = parseBody(rollbackConfigVersionSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);
    const { version } = parsed.data;
    const restored = await rollbackToVersion(version, auth.userId, auth.userName);
    return NextResponse.json({ ok: true, config: restored, version });
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Erreur rollback', 500);
  }
}
