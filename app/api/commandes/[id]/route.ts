export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireApiAccess, requirePermission } from '@/lib/auth-utils';
import { logAuditChange } from '@/lib/audit';
import { createNotification } from '@/lib/services/notification-service';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { resolveParams } from '@/lib/api/route-params';
import { updateCommandeInputSchema } from '@/lib/server/modules/commandes/commandes.validation';
import { getCommandeDetail, updateCommandeRecord } from '@/lib/server/modules/commandes/commandes.service';

export async function GET(
  _req: NextRequest,
  ctx: { params: { id: string } | Promise<{ id: string }> },
) {
  const auth = await requirePermission('commandes:read');
  if ('error' in auth) return auth.error;

  const { id } = await resolveParams(ctx.params);

  return runApiHandler('commandes GET [id]', async () => {
    const commande = await getCommandeDetail(id);
    if (!commande) return apiError('Commande introuvable', 404);
    return NextResponse.json(commande);
  });
}

export async function PUT(
  req: NextRequest,
  ctx: { params: { id: string } | Promise<{ id: string }> },
) {
  const auth = await requireApiAccess('commandes:write', req);
  if ('error' in auth) return auth.error;

  const { id } = await resolveParams(ctx.params);

  return runApiHandler('commandes PUT [id]', async (): Promise<Response> => {
    const parsed = parseBody(updateCommandeInputSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    const result = await updateCommandeRecord(id, parsed.data, {
      userId: auth.userId,
      userName: auth.userName,
      role: auth.role,
    });

    if (!result.ok) {
      if (result.code === 'NOT_FOUND') return apiError(result.message, 404);
      if (result.code === 'FORBIDDEN') return apiError(result.message, 403);
      if (result.code === 'CONFLICT') return apiError(result.message, 409);
      return apiError(result.message, 400);
    }

    if ('noop' in result && result.noop) {
      return NextResponse.json(result.commande);
    }

    const { commande, audit, notify } = result as Extract<typeof result, { audit: unknown }>;

    await logAuditChange({
      userId: auth.userId,
      userName: auth.userName,
      action: audit.action,
      entity: 'Commande',
      entityId: commande.id,
      entityLabel: commande.numero,
      oldValue: audit.oldValue,
      newValue: audit.newValue,
    });

    if (notify) {
      await createNotification({
        title: notify.title,
        message: notify.message,
        link: `/commandes/${commande.id}`,
        type: notify.type,
        category: 'commandes',
      });
    }

    return NextResponse.json(commande);
  });
}
