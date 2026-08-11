export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireMessagingWrite } from '@/lib/messaging/route-auth';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { messagePinInputSchema } from '@/lib/server/modules/messaging/messages.validation';
import { resolveParams } from '@/lib/api/route-params';
import {
  mapPinError,
  pinConversationMessage,
} from '@/lib/server/modules/messaging/message-pin.service';

export async function POST(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requireMessagingWrite();
  if ('error' in auth) return auth.error;

  return runApiHandler('messaging pin POST', async (): Promise<Response> => {
    const parsed = parseBody(messagePinInputSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    try {
      const msg = await pinConversationMessage(id, parsed.data.pinned, {
        userId: auth.userId,
        role: auth.role,
      });
      return NextResponse.json(msg);
    } catch (error) {
      const mapped = mapPinError(error);
      if (mapped) return apiError(mapped.message, mapped.status);
      return apiError(safeErrorMessage(error, 'Erreur épinglage'), 500);
    }
  });
}
