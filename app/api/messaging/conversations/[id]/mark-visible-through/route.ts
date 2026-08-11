export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMessagingWrite } from '@/lib/messaging/route-auth';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { resolveParams } from '@/lib/api/route-params';
import { markVisibleThrough } from '@/lib/messaging/messaging-service';

const bodySchema = z.object({
  throughMessageId: z.string().min(1),
});

/** POST — marquage lu explicite (V14 P0-15), pas de side-effect GET. */
export async function POST(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id: conversationId } = await resolveParams(ctx.params);
  const auth = await requireMessagingWrite();
  if ('error' in auth) return auth.error;

  return runApiHandler('messaging mark-visible-through POST', async () => {
    const parsed = parseBody(bodySchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    try {
      const result = await markVisibleThrough({
        conversationId,
        userId: auth.userId,
        throughMessageId: parsed.data.throughMessageId,
      });
      return NextResponse.json({ ok: true, ...result });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'NOT_MEMBER') return apiError('Accès refusé', 403);
        if (error.message === 'NOT_FOUND') return apiError('Message introuvable', 404);
      }
      return apiError(safeErrorMessage(error, 'Erreur marquage lu'), 500);
    }
  });
}
