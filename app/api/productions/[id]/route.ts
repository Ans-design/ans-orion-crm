export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireApiAccess } from '@/lib/auth-utils';
import { logAuditChange } from '@/lib/audit';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { updateProductionSchema } from '@/lib/server/modules/productions/productions.validation';
import { getProductionDetail, updateProductionRecord } from '@/lib/server/modules/productions/productions.service';
import { resolveParams } from '@/lib/api/route-params';

export async function GET(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requireApiAccess('production:read', req);
  if ('error' in auth) return auth.error;

  return runApiHandler('productions/[id] GET', async () => {
    const production = await getProductionDetail(id);
    if (!production) return NextResponse.json({ error: 'Non trouvé' }, { status: 404 });
    return NextResponse.json(production);
  });
}

export async function PUT(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requireApiAccess('production:write', req);
  if ('error' in auth) return auth.error;

  return runApiHandler('productions/[id] PUT', async (): Promise<Response> => {
    const parsed = parseBody(updateProductionSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    const result = await updateProductionRecord(id, parsed.data, {
      userId: auth.userId,
      userName: auth.userName,
    });

    if (!result.ok) {
      if (result.code === 'NOT_FOUND') return NextResponse.json({ error: 'Non trouvé' }, { status: 404 });
      return apiError(result.message, 400);
    }

    const { production, audit } = result;
    if (audit.hasChanges) {
      await logAuditChange({
        userId: auth.userId,
        userName: auth.userName,
        action: 'UPDATE',
        entity: 'Production',
        entityId: production.id,
        entityLabel: production.commande?.numero ?? production.id,
        oldValue: audit.oldValue,
        newValue: audit.newValue,
      });
    }

    return NextResponse.json(production);
  });
}
