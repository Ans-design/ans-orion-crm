export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireMessagingWrite } from '@/lib/messaging/route-auth';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { messageReactionInputSchema } from '@/lib/server/modules/messaging/messages.validation';
import { resolveParams } from '@/lib/api/route-params';
import {
  mapReactionError,
  toggleConversationMessageReaction,
} from '@/lib/server/modules/messaging/message-reactions.service';

export async function POST(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requireMessagingWrite();
  if ('error' in auth) return auth.error;

  return runApiHandler('messaging reaction POST', async (): Promise<Response> => {
    const parsed = parseBody(messageReactionInputSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    try {
      const result = await toggleConversationMessageReaction(
        id,
        auth.userId,
        parsed.data.emoji,
      );
      return NextResponse.json(result);
    } catch (error) {
      const mapped = mapReactionError(error);
      if (mapped) return apiError(mapped.message, mapped.status);
      return apiError(safeErrorMessage(error, 'Erreur réaction'), 500);
    }
  });
}
