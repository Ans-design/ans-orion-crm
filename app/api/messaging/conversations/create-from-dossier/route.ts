export const dynamic = 'force-dynamic';



import { NextRequest, NextResponse } from 'next/server';

import { requireMessagingWrite } from '@/lib/messaging/route-auth';

import { apiError, safeErrorMessage } from '@/lib/api-response';

import { hasPermission } from '@/lib/auth-utils';

import { parseBody } from '@/lib/validators/common';

import { runApiHandler } from '@/lib/api-guard';

import { createDossierConversationInputSchema } from '@/lib/server/modules/messaging/conversations.validation';

import { created } from '@/lib/server/http/api-response';
import {

  createConversationFromDossier,

  mapDossierConversationError,

} from '@/lib/server/modules/messaging/conversation-links.service';



export async function POST(req: NextRequest) {

  const auth = await requireMessagingWrite();

  if ('error' in auth) return auth.error;



  if (!hasPermission(auth.role, 'production:write')) {

    return apiError('Permission insuffisante', 403);

  }



  return runApiHandler('messaging create-from-dossier POST', async (): Promise<Response> => {

    const parsed = parseBody(createDossierConversationInputSchema, await req.json());

    if (!parsed.ok) return apiError(parsed.error, 400);



    try {

      const conv = await createConversationFromDossier(parsed.data, {

        userId: auth.userId,

        userName: auth.userName,

      });

      return created(conv);

    } catch (error) {

      const mapped = mapDossierConversationError(error);

      if (mapped) return apiError(mapped.message, mapped.status);

      return apiError(safeErrorMessage(error, 'Erreur création groupe dossier'), 500);

    }

  });

}

