export const dynamic = 'force-dynamic';



import { NextRequest, NextResponse } from 'next/server';
import { resolveParams } from '@/lib/api/route-params';

import { requireMessagingWrite } from '@/lib/messaging/route-auth';

import { apiError, safeErrorMessage } from '@/lib/api-response';

import { parseBody } from '@/lib/validators/common';

import { runApiHandler } from '@/lib/api-guard';

import { createTaskFromMessageInputSchema } from '@/lib/server/modules/messaging/messages.validation';

import { createMessageLinkedTask } from '@/lib/server/modules/messaging/message-task.service';
import { created } from '@/lib/server/http/api-response';



export async function POST(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);

  const auth = await requireMessagingWrite();

  if ('error' in auth) return auth.error;



  return runApiHandler('messaging create-task POST', async (): Promise<Response> => {

    const parsed = parseBody(createTaskFromMessageInputSchema, await req.json());

    if (!parsed.ok) return apiError(parsed.error, 400);



    try {

      const result = await createMessageLinkedTask(id, parsed.data, {

        userId: auth.userId,

        userName: auth.userName,

      });

      return created(result);

    } catch (error) {

      return apiError(safeErrorMessage(error, 'Erreur création tâche'), 500);

    }

  });

}

