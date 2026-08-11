export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { requireApiAccess } from '@/lib/auth-utils';
import { logAudit } from '@/lib/audit';
import { created, ok } from '@/lib/server/http/api-response';
import { withAuthApi, type AuthApiContext } from '@/lib/server/auth/with-auth-api';
import { parseBody } from '@/lib/server/validation/common';
import { createFactureInputSchema } from '@/lib/server/modules/factures/factures.validation';
import {
  createFactureRecord,
  getFacturesStats,
  listFactures,
  parseFactureListQuery,
} from '@/lib/server/modules/factures/factures.service';

export const GET = withAuthApi(
  'factures GET',
  async (_auth, req: NextRequest) => {
    const query = parseFactureListQuery(new URL(req.url).searchParams);

    if (query.stats) {
      const stats = await getFacturesStats();
      return ok({ stats });
    }

    const result = await listFactures(query);
    return ok(result);
  },
  {
    permission: 'factures:read',
    fallbackResponse: { ok: true, data: [] },
  },
);

export async function POST(req: NextRequest) {
  return withAuthApi(
    'factures POST',
    async (auth: AuthApiContext, request) => {
      const access = await requireApiAccess('factures:write', request);
      if ('error' in access) return access.error;

      const parsed = parseBody(createFactureInputSchema, await request.json(), 'factures POST');
      if (!parsed.ok) return parsed.response;

      const facture = await createFactureRecord(parsed.data);

      await logAudit({
        userId: auth.userId,
        userName: auth.userName,
        action: 'CREATE',
        entity: 'Facture',
        entityId: facture.id,
        entityLabel: facture.numero,
        details: { totalTTC: facture.totalTTC },
      });

      return created(facture);
    },
    { permission: 'factures:write' },
  )(req);
}
