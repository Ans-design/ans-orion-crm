export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { logAudit, logAuditChange } from '@/lib/audit';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { updateClientInputSchema } from '@/lib/server/modules/clients/clients.validation';
import { resolveParams } from '@/lib/api/route-params';
import {
  archiveClient,
  getClientDetail,
  updateClientRecord,
} from '@/lib/server/modules/clients/clients.service';

export async function GET(_req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('clients:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('clients GET [id]', async () => {
    const detail = await getClientDetail(id);
    if (!detail) return apiError('Client introuvable', 404);
    return NextResponse.json(detail);
  });
}

export async function PUT(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('clients:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('clients PUT [id]', async (): Promise<Response> => {
    const parsed = parseBody(updateClientInputSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    const outcome = await updateClientRecord(id, parsed.data);
    if (outcome.status === 'not_found') return apiError('Client introuvable', 404);

    const { client, audit } = outcome;
    if (audit.hasChanges) {
      await logAuditChange({
        userId: auth.userId,
        userName: auth.userName,
        action: 'UPDATE',
        entity: 'Client',
        entityId: client.id,
        entityLabel: client.name,
        oldValue: audit.oldValue,
        newValue: audit.newValue,
      });
    }

    return NextResponse.json(client);
  });
}

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('clients:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('clients DELETE [id]', async () => {
    const outcome = await archiveClient(id);
    if (outcome.status === 'not_found') return apiError('Client introuvable', 404);

    const { client, linkedCounts } = outcome;
    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'ARCHIVE',
      entity: 'Client',
      entityId: client.id,
      entityLabel: client.name,
      details: linkedCounts,
    });

    return NextResponse.json(client);
  });
}
