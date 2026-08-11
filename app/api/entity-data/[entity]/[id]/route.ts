export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { runApiHandler } from '@/lib/api-guard';
import { ok } from '@/lib/server/http/api-response';
import { apiError } from '@/lib/api-response';
import { getEntityExcelModule, type EntityExcelId } from '@/lib/crm/entity-excel-modules';
import {
  restoreEntity,
  softArchiveEntity,
} from '@/lib/server/modules/entity-data/entity-data.service';
import { resolveParams } from '@/lib/api/route-params';

export async function POST(
  req: NextRequest,
  ctx: { params: { entity: string; id: string } | Promise<{ entity: string; id: string }> },
) {
  const { entity, id } = await resolveParams(ctx.params);
  const mod = getEntityExcelModule(entity);
  if (!mod) return apiError('Module inconnu', 404);

  const auth = await requirePermission(mod.permissionWrite);
  if ('error' in auth) return auth.error;

  const action = new URL(req.url).searchParams.get('action') || 'archive';

  return runApiHandler(`entity-data/${entity}/${id}/${action}`, async () => {
    if (action === 'restore') {
      await restoreEntity(entity as EntityExcelId, id);
      return ok({ restored: true, id });
    }
    await softArchiveEntity(entity as EntityExcelId, id, auth.userId);
    return ok({ archived: true, id });
  });
}
