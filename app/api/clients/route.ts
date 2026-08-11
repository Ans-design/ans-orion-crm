export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { logAudit } from '@/lib/audit';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { created } from '@/lib/server/http/api-response';
import { runApiHandler } from '@/lib/api-guard';
import { createClientInputSchema } from '@/lib/server/modules/clients/clients.validation';
import {
  createClientRecord,
  getClientsSummary,
  listClients,
  parseClientListQuery,
} from '@/lib/server/modules/clients/clients.service';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('clients:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('clients GET', async () => {
    const query = parseClientListQuery(new URL(req.url).searchParams);

    if (query.summary) {
      return NextResponse.json(await getClientsSummary());
    }

    const result = await listClients(query);
    return NextResponse.json(result);
  }, { fallback: { clients: [], total: 0 } });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('clients:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('clients POST', async (): Promise<Response> => {
    const parsed = parseBody(createClientInputSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    const outcome = await createClientRecord(parsed.data);

    if (outcome.status === 'duplicate') {
      return NextResponse.json(
        {
          error: 'Doublon potentiel détecté',
          duplicates: outcome.duplicates,
          hint: 'Reliez le client existant ou confirmez avec forceDuplicate: true',
        },
        { status: 409 },
      );
    }

    const { client } = outcome;
    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'CREATE',
      entity: 'Client',
      entityId: client.id,
      entityLabel: `${client.name} (${client.code})`,
    });

    return created(client);
  });
}
