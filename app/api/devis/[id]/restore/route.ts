export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { ok } from '@/lib/server/http/api-response';
import { ApiError } from '@/lib/server/http/errors';
import { resolveParams } from '@/lib/api/route-params';
import { restoreDevisRecord } from '@/lib/server/modules/devis/devis.service';

export async function POST(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  return withAuthApi(
    'devis/[id]/restore POST',
    async () => {
      const outcome = await restoreDevisRecord(id);
      if (outcome === 'not_found') throw ApiError.notFound('Devis introuvable');
      return ok({ restored: true, id });
    },
    { permission: 'devis:write' },
  )(req);
}
