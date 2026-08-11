export const dynamic = 'force-dynamic';

import { ok } from '@/lib/server/http/api-response';
import { withAuthApi, type AuthApiContext } from '@/lib/server/auth/with-auth-api';
import { getNavBadgeCounts } from '@/lib/navigation/nav-badges-service';
import { EMPTY_NAV_BADGES } from '@/lib/navigation/nav-badges-shared';

export const GET = withAuthApi(
  'nav/badges GET',
  async (auth: AuthApiContext) => {
    const badges = await getNavBadgeCounts(auth.userId);
    return ok({ badges, at: Date.now() });
  },
  {
    fallbackResponse: { badges: EMPTY_NAV_BADGES, at: Date.now() },
  },
);
