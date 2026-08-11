export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireApiAccess, requirePermission } from '@/lib/auth-utils';
import { logAuditChange } from '@/lib/audit';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { updateFactureInputSchema } from '@/lib/server/modules/factures/factures.validation';
import { resolveParams } from '@/lib/api/route-params';
import {
  factureErrorStatus,
  getFactureDetail,
  updateFactureRecord,
} from '@/lib/server/modules/factures/factures.service';

export async function GET(_req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('factures:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('factures GET [id]', async () => {
    const facture = await getFactureDetail(id);
    if (!facture) return apiError('Facture introuvable', 404);
    return NextResponse.json(facture);
  });
}

export async function PUT(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requireApiAccess('factures:write', req);
  if ('error' in auth) return auth.error;

  return runApiHandler('factures PUT [id]', async (): Promise<Response> => {
    const parsed = parseBody(updateFactureInputSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    try {
      const result = await updateFactureRecord(id, parsed.data);
      if (!result.ok) {
        return apiError(result.message, factureErrorStatus(result.code));
      }

      const { facture, audit } = result;
      if (audit.hasChanges) {
        await logAuditChange({
          userId: auth.userId,
          userName: auth.userName,
          action: facture.statut !== audit.oldValue.statut ? 'STATUS_CHANGE' : 'UPDATE',
          entity: 'Facture',
          entityId: facture.id,
          entityLabel: facture.numero,
          oldValue: audit.oldValue,
          newValue: audit.newValue,
        });
      }

      return NextResponse.json(facture);
    } catch (error) {
      return apiError(safeErrorMessage(error, 'Erreur mise à jour facture'), 500);
    }
  });
}
