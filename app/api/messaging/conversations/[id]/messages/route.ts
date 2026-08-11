export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireMessagingAuth, requireMessagingWrite } from '@/lib/messaging/route-auth';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { sendMessageInputSchema } from '@/lib/server/modules/messaging/messages.validation';
import { resolveParams } from '@/lib/api/route-params';
import { created } from '@/lib/server/http/api-response';
import {
  listConversationMessages,
  sendConversationMessage,
} from '@/lib/server/modules/messaging/messages.service';

export async function GET(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requireMessagingAuth();
  if ('error' in auth) return auth.error;

  return runApiHandler('messaging messages GET', async () => {
    try {
      const result = await listConversationMessages(
        id,
        { userId: auth.userId, role: auth.role },
        {
          search: req.nextUrl.searchParams.get('search') || undefined,
          before: req.nextUrl.searchParams.get('before') || undefined,
          limit: Number(req.nextUrl.searchParams.get('limit') ?? 100) || 100,
        },
      );
      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'NOT_MEMBER') {
        return apiError('Accès refusé à cette conversation', 403);
      }
      throw error;
    }
  }, { fallback: { messages: [], attachments: [] } });
}

export async function POST(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requireMessagingWrite();
  if ('error' in auth) return auth.error;

  return runApiHandler('messaging messages POST', async (): Promise<Response> => {
    const parsed = parseBody(sendMessageInputSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    try {
      const result = await sendConversationMessage(id, parsed.data, {
        userId: auth.userId,
        userName: auth.userName,
        role: auth.role,
      });

      if (!result.ok) {
        const status = result.code === 'FORBIDDEN' ? 403 : 400;
        return apiError(result.message, status);
      }

      return created(result.message);
    } catch (error) {
      return apiError(safeErrorMessage(error, 'Erreur envoi message'), 500);
    }
  });
}
