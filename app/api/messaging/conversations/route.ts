export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { safeErrorMessage } from '@/lib/api-response';
import { created, ok } from '@/lib/server/http/api-response';
import { ApiError } from '@/lib/server/http/api-error';
import { withAuthApi, type AuthApiContext } from '@/lib/server/auth/with-auth-api';
import { parseBody } from '@/lib/server/validation/common';
import { createConversationInputSchema } from '@/lib/server/modules/messaging/conversations.validation';
import {
  createConversationRecord,
  listUserConversations,
} from '@/lib/server/modules/messaging/conversations.service';

export const GET = withAuthApi(
  'messaging conversations GET',
  async (auth: AuthApiContext) => {
    try {
      const conversations = await listUserConversations(auth.userId, auth.role);
      return ok({ conversations });
    } catch (error) {
      const msg = safeErrorMessage(error, 'Erreur chargement conversations');
      if (/P2022|devisId|column|does not exist/i.test(msg)) {
        return ok({ conversations: [], degraded: true, code: 'SCHEMA_INCOMPLETE' });
      }
      throw error;
    }
  },
  { messaging: true, fallbackResponse: { conversations: [] } },
);

export async function POST(req: NextRequest) {
  return withAuthApi(
    'messaging conversations POST',
    async (auth, request) => {
      const parsed = parseBody(createConversationInputSchema, await request.json(), 'messaging conversations POST');
      if (!parsed.ok) return parsed.response;

      const result = await createConversationRecord(parsed.data, {
        userId: auth.userId,
        userName: auth.userName,
      });

      if (!result.ok) {
        throw ApiError.badRequest(result.message, { code: result.code });
      }

      return created(result.conversation);
    },
    { messagingWrite: true },
  )(req);
}
