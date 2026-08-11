export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { ok } from '@/lib/server/http/api-response';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { bumpLiveRevisions } from '@/lib/server/live/live-revision-bus';
import { parseBody } from '@/lib/server/validation/common';
import { z } from 'zod';

const bumpSchema = z.object({
  domains: z.array(z.string().min(1).max(40)).min(1).max(24),
});

/** Signal multi-postes — appelé après mutation réussie côté client (emitOrionLive). */
export const POST = withAuthApi(
  'live/bump POST',
  async (_auth, req: NextRequest) => {
    const parsed = parseBody(bumpSchema, await req.json(), 'live/bump');
    if (!parsed.ok) return parsed.response;
    const global = bumpLiveRevisions(parsed.data.domains);
    return ok({ global });
  },
);
