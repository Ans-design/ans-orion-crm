export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireApiAccess } from '@/lib/auth-utils';
import { logAuditChange } from '@/lib/audit';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { updateProductionEtapeSchema } from '@/lib/server/modules/productions/productions.validation';
import { resolveParams } from '@/lib/api/route-params';
import {
  listProductionEtapes,
  updateProductionEtapeRecord,
} from '@/lib/server/modules/productions/productions.service';

export async function GET(_req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requireApiAccess('production:read', _req);
  if ('error' in auth) return auth.error;

  return runApiHandler('productions/[id]/etapes GET', async () => {
    const result = await listProductionEtapes(id);
    if (!result.ok) return NextResponse.json({ error: 'Production introuvable' }, { status: 404 });
    return NextResponse.json({ etapes: result.etapes, productionId: id });
  });
}

export async function PUT(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requireApiAccess('production:write', req);
  if ('error' in auth) return auth.error;

  return runApiHandler('productions/[id]/etapes PUT', async (): Promise<Response> => {
    const parsed = parseBody(updateProductionEtapeSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    const result = await updateProductionEtapeRecord(id, parsed.data, {
      userId: auth.userId,
      userName: auth.userName,
    });

    if (!result.ok) {
      if (result.code === 'NOT_FOUND') return NextResponse.json({ error: 'Étape introuvable' }, { status: 404 });
      return apiError(result.message, 400);
    }

    const { production, audit } = result;
    await logAuditChange({
      userId: auth.userId,
      userName: auth.userName,
      action: 'UPDATE',
      entity: 'ProductionEtape',
      entityId: audit.etapeId,
      entityLabel: audit.etapeLabel,
      oldValue: audit.oldValue,
      newValue: audit.newValue,
    });

    return NextResponse.json(production);
  });
}
