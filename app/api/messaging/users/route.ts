export const dynamic = 'force-dynamic';

import { ok } from '@/lib/server/http/api-response';
import { withAuthApi, type AuthApiContext } from '@/lib/server/auth/with-auth-api';
import { canManageUsers } from '@/lib/auth-utils';
import { listMessagingUsers } from '@/lib/server/modules/messaging/users.service';

export const GET = withAuthApi(
  'messaging users GET',
  async (auth: AuthApiContext) => {
    const users = await listMessagingUsers(
      { userId: auth.userId, role: auth.role },
      { showEmail: canManageUsers(auth.role) },
    );
    return ok(users);
  },
  { messaging: true, fallbackResponse: [] },
);
