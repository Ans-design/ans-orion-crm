export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireApiAccess } from '@/lib/auth-utils';
import { logAuditChange } from '@/lib/audit';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { updateLivraisonInputSchema } from '@/lib/server/modules/livraisons/livraisons.validation';
import { resolveParams } from '@/lib/api/route-params';
import {
  getLivraisonDetail,
  livraisonErrorStatus,
  updateLivraisonRecord,
} from '@/lib/server/modules/livraisons/livraisons.service';

export async function GET(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requireApiAccess('livraisons:read', req);
  if ('error' in auth) return auth.error;

  return runApiHandler('livraisons GET [id]', async () => {
    const livraison = await getLivraisonDetail(id);
    if (!livraison) return NextResponse.json({ error: 'Non trouvé' }, { status: 404 });
    return NextResponse.json(livraison);
  });
}

export async function PUT(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requireApiAccess('livraisons:write', req);
  if ('error' in auth) return auth.error;

  return runApiHandler('livraisons PUT [id]', async (): Promise<Response> => {
    const parsed = parseBody(updateLivraisonInputSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    const result = await updateLivraisonRecord(id, parsed.data, {
      userId: auth.userId,
      userName: auth.userName,
    });

    if (!result.ok) {
      if (result.code === 'PROOF_REQUIRED' || result.code === 'VALIDATION') {
        return apiError(result.message, 400);
      }
      return apiError(result.message, livraisonErrorStatus(result.code));
    }

    const { livraison, audit } = result;
    await logAuditChange({
      userId: auth.userId,
      userName: auth.userName,
      action: 'UPDATE',
      entity: 'Livraison',
      entityId: livraison.id,
      entityLabel: livraison.numero ?? livraison.id,
      oldValue: audit.oldValue,
      newValue: audit.newValue,
    });

    return NextResponse.json(livraison);
  });
}
