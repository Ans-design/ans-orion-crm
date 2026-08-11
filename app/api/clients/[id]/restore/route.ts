export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { logAudit } from '@/lib/audit';
import { apiError } from '@/lib/api-response';
import { runApiHandler } from '@/lib/api-guard';
import { restoreClient } from '@/lib/server/modules/clients/clients.service';
import { resolveParams } from '@/lib/api/route-params';

/** Restaure un client archivé */
export async function POST(_req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('clients:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('clients restore [id]', async () => {
    const outcome = await restoreClient(id);
    if (outcome.status === 'not_found') return apiError('Client introuvable', 404);
    if (outcome.status === 'already_active') return apiError('Client déjà actif', 400);

    const { client } = outcome;
    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'UPDATE',
      entity: 'Client',
      entityId: client.id,
      entityLabel: `${client.name} (restauré)`,
    });

    return NextResponse.json(client);
  });
}
