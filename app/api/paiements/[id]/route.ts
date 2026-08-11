export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { logAuditChange } from '@/lib/audit';
import { parseBody } from '@/lib/validators/common';
import { apiError } from '@/lib/api-response';
import { runApiHandler } from '@/lib/api-guard';
import { updatePaiementInputSchema } from '@/lib/server/modules/paiements/paiements.validation';
import { getPaiementDetail, updatePaiementRecord } from '@/lib/server/modules/paiements/paiements.service';

type RouteParams = { params: Promise<{ id: string }> | { id: string } };

async function resolveId(params: RouteParams['params']) {
  const resolved = await Promise.resolve(params);
  return resolved.id;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission('paiements:read');
  if ('error' in auth) return auth.error;

  const id = await resolveId(params);

  return runApiHandler('paiements/[id] GET', async () => {
    const paiement = await getPaiementDetail(id);
    if (!paiement) return NextResponse.json({ error: 'Non trouvé' }, { status: 404 });
    return NextResponse.json(paiement);
  });
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission('paiements:write');
  if ('error' in auth) return auth.error;

  const id = await resolveId(params);

  return runApiHandler('paiements/[id] PUT', async (): Promise<Response> => {
    const parsed = parseBody(updatePaiementInputSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    const result = await updatePaiementRecord(id, parsed.data);
    if (!result.ok) return NextResponse.json({ error: 'Non trouvé' }, { status: 404 });

    const { paiement, audit } = result;
    if (audit.hasChanges) {
      await logAuditChange({
        userId: auth.userId,
        userName: auth.userName,
        action: 'UPDATE',
        entity: 'Paiement',
        entityId: paiement.id,
        entityLabel: paiement.numero,
        oldValue: audit.oldValue,
        newValue: audit.newValue,
      });
    }

    return NextResponse.json(paiement);
  });
}
