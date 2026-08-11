export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { logAudit } from '@/lib/audit';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { quickCreateClientInputSchema } from '@/lib/server/modules/clients/clients.validation';
import { quickCreateClientRecord } from '@/lib/server/modules/clients/clients.service';
import { created } from '@/lib/server/http/api-response';

export async function POST(req: NextRequest) {
  const auth = await requirePermission('clients:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('clients quick-create', async (): Promise<Response> => {
    const parsed = parseBody(quickCreateClientInputSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    const client = await quickCreateClientRecord(parsed.data);

    await logAudit({
      action: 'CLIENT_CREATE',
      entity: 'Client',
      entityId: client.id,
      details: `Création rapide POS — ${client.name}`,
      userId: auth.userId,
      userName: auth.userName,
    });

    return created({ client });
  });
}
