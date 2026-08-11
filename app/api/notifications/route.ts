export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { ok } from '@/lib/server/http/api-response';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { parseBody } from '@/lib/server/validation/common';
import { markNotificationsSchema } from '@/lib/server/modules/notifications/notifications.validation';
import {
  getNotificationDrawerItems,
  listUserNotifications,
  markNotificationsRead,
} from '@/lib/server/modules/notifications/notifications.service';

export const GET = withAuthApi(
  'notifications GET',
  async (auth, req: NextRequest) => {
    const { searchParams } = req.nextUrl;
    if (searchParams.get('drawer') === '1') {
      const drawer = await getNotificationDrawerItems(auth.userId, auth.role);
      return ok(drawer, { quality: drawer.quality ?? 'OK' });
    }

    const unreadOnly = searchParams.get('unread') === 'true';
    const data = await listUserNotifications(auth.userId, { unreadOnly });
    return ok(data, { quality: data.quality });
  },
  {
    // V14 : ne plus renvoyer ok:true + liste vide trompeuse
    fallbackResponse: {
      ok: false,
      error: { message: 'Notifications indisponibles', code: 'UNAVAILABLE' },
      meta: { quality: 'ERROR' },
    },
  },
);

export async function PATCH(req: NextRequest) {
  return withAuthApi(
    'notifications PATCH',
    async (auth, request) => {
      const parsed = parseBody(markNotificationsSchema, await request.json(), 'notifications PATCH');
      if (!parsed.ok) return parsed.response;

      const result = await markNotificationsRead(auth.userId, parsed.data);
      return ok(result, { quality: 'OK' });
    },
    {
      fallbackResponse: {
        ok: false,
        error: { message: 'Marquage lu indisponible', code: 'UNAVAILABLE' },
        meta: { quality: 'ERROR' },
      },
    },
  )(req);
}
