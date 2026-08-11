export const dynamic = 'force-dynamic';

import { ok } from '@/lib/server/http/api-response';
import { withAuthApi, type AuthApiContext } from '@/lib/server/auth/with-auth-api';
import { getUnreadMessageCount } from '@/lib/server/modules/messaging/unread.service';

export const GET = withAuthApi(
  'messaging unread GET',
  async (auth: AuthApiContext) => {
    const count = await getUnreadMessageCount(auth.userId);
    return ok({ unreadCount: count });
  },
  { messaging: true, fallbackResponse: { unreadCount: 0 } },
);
