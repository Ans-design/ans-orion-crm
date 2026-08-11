export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { ok } from '@/lib/server/http/api-response';
import { runApiHandler } from '@/lib/api-guard';
import { cleanAndMergeMaterials } from '@/lib/server/modules/materials/material-merge.service';

export async function POST(req: NextRequest) {
  const auth = await requirePermission('tarifs:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('materials clean-merge POST', async () => {
    const body = await req.json().catch(() => ({}));
    const dryRun = Boolean((body as { dryRun?: boolean }).dryRun);
    const result = await cleanAndMergeMaterials({
      userId: auth.userId,
      userName: auth.userName,
      dryRun,
    });
    return ok(result);
  });
}
