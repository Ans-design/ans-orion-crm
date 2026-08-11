export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { ApiError } from '@/lib/server/http/errors';
import { ok } from '@/lib/server/http/api-response';
import { withAuthApi, type AuthApiContext } from '@/lib/server/auth/with-auth-api';
import { stripCommande360Overview } from '@/lib/auth/margin-access';
import { getCommande360 } from '@/lib/services/commande-360-service';
import { resolveParams } from '@/lib/api/route-params';

export async function GET(
  req: NextRequest,
  ctx: { params: { id: string } | Promise<{ id: string }> },
) {
  const { id } = await resolveParams(ctx.params);
  return withAuthApi(
    'commandes/[id]/overview GET',
    async (auth: AuthApiContext) => {
      const data = await getCommande360(id);
      if (!data) throw ApiError.notFound('Commande introuvable');
      return ok(stripCommande360Overview(data, auth.role));
    },
    { permission: 'commandes:read' },
  )(req);
}
