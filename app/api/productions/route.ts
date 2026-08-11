export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireApiAccess } from '@/lib/auth-utils';
import { logAuditChange } from '@/lib/audit';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { createProductionSchema } from '@/lib/server/modules/productions/productions.validation';
import { createProductionRecord, listProductions, parseProductionListQuery } from '@/lib/server/modules/productions/productions.service';
import { created, ok } from '@/lib/server/http/api-response';

export async function GET(req: NextRequest) {
  const auth = await requireApiAccess('production:read', req);
  if ('error' in auth) return auth.error;

  return runApiHandler('productions GET', async () => {
    const query = parseProductionListQuery(new URL(req.url).searchParams);
    const result = await listProductions(query);
    return ok(result);
  }, { fallbackResponse: { ok: true, data: [] } });
}

export async function POST(req: NextRequest) {
  const auth = await requireApiAccess('production:write', req);
  if ('error' in auth) return auth.error;

  return runApiHandler('productions POST', async (): Promise<Response> => {
    const parsed = parseBody(createProductionSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    const result = await createProductionRecord(parsed.data, {
      userId: auth.userId,
      userName: auth.userName,
    });

    if (!result.ok) {
      if (result.code === 'NOT_FOUND') return apiError(result.message, 404);
      return apiError(result.message, 400);
    }

    const { production } = result;
    await logAuditChange({
      userId: auth.userId,
      userName: auth.userName,
      action: 'CREATE',
      entity: 'Production',
      entityId: production.id,
      entityLabel: production.commande?.numero ?? production.id,
      newValue: { commandeId: parsed.data.commandeId, statut: production.statut },
    });

    return created(production);
  });
}
