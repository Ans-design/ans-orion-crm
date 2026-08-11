export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { logPosAudit } from '@/lib/pos-audit';
import { runApiHandler } from '@/lib/api-guard';
import { batchPaiementInputSchema } from '@/lib/server/modules/paiements/paiements.validation';
import { created } from '@/lib/server/http/api-response';
import {
  createBatchPaiements,
  paiementErrorStatus,
} from '@/lib/server/modules/paiements/paiements.service';

export async function POST(req: NextRequest) {
  const auth = await requirePermission('paiements:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('paiements batch POST', async (): Promise<Response> => {
    const parsed = parseBody(batchPaiementInputSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    try {
      const result = await createBatchPaiements(parsed.data, { role: auth.role });
      if (!result.ok) {
        return apiError(result.message, paiementErrorStatus(result.code));
      }

      await logPosAudit({
        userId: auth.userId,
        userName: auth.userName,
        action: 'PAYMENT_BATCH',
        entity: 'Paiement',
        entityId: result.receiptNum,
        entityLabel: `${result.receiptNum} (${parsed.data.lines.length} lignes)`,
        details: {
          total: result.total,
          modes: parsed.data.lines.map((l) => l.mode),
          source: parsed.data.source,
        },
      });

      return created(result);
    } catch (error) {
      return apiError(safeErrorMessage(error, 'Erreur paiement multiple'), 500);
    }
  });
}
