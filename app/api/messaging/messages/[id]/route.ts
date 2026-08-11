export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireMessagingWrite } from '@/lib/messaging/route-auth';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { editMessageInputSchema } from '@/lib/server/modules/messaging/messages.validation';
import { resolveParams } from '@/lib/api/route-params';
import {
  deleteConversationMessage,
  editConversationMessage,
  mapMessageActionError,
} from '@/lib/server/modules/messaging/messages-actions.service';

export async function PATCH(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requireMessagingWrite();
  if ('error' in auth) return auth.error;

  return runApiHandler('messaging message PATCH', async (): Promise<Response> => {
    const parsed = parseBody(editMessageInputSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    try {
      const msg = await editConversationMessage(id, parsed.data.body, {
        userId: auth.userId,
        role: auth.role,
      });
      return NextResponse.json(msg);
    } catch (error) {
      const mapped = mapMessageActionError(error);
      if (mapped) return apiError(mapped.message, mapped.status);
      return apiError(safeErrorMessage(error, 'Erreur modification'), 500);
    }
  });
}

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requireMessagingWrite();
  if ('error' in auth) return auth.error;

  return runApiHandler('messaging message DELETE', async (): Promise<Response> => {
    try {
      const msg = await deleteConversationMessage(id, {
        userId: auth.userId,
        role: auth.role,
      });
      return NextResponse.json(msg);
    } catch (error) {
      const mapped = mapMessageActionError(error);
      if (mapped) return apiError(mapped.message === 'Action non autorisée' ? 'Suppression non autorisée' : mapped.message, mapped.status);
      return apiError(safeErrorMessage(error, 'Erreur suppression'), 500);
    }
  });
}
