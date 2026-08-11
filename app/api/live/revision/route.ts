export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { ok } from '@/lib/server/http/api-response';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { getLiveRevisionsSnapshot } from '@/lib/server/live/live-revision-bus';

/**
 * Révisions live multi-postes — polling léger par domaines.
 * Auth requise (évite fuite d’activité anonyme).
 */
export const GET = withAuthApi(
  'live/revision GET',
  async (_auth, req: NextRequest) => {
    const raw = req.nextUrl.searchParams.get('domains') || '';
    const domains = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 24);
    if (!domains.length) {
      return ok({ global: 0, revisions: {}, max: 0 });
    }
    return ok(getLiveRevisionsSnapshot(domains));
  },
);
