export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth-utils';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseOr400 } from '@/lib/validators/parse';
import { updateFiscalObligation } from '@/lib/services/fiscal-obligation-service';
import { resolveParams } from '@/lib/api/route-params';

const patchSchema = z.object({
  type: z.string().optional(),
  label: z.string().optional(),
  periode: z.string().optional(),
  dateEcheance: z.string().optional(),
  montant: z.number().optional(),
  statut: z.enum(['a_preparer', 'en_cours', 'depose', 'archive']).optional(),
  notes: z.string().optional(),
  documentKey: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: { id: string } | Promise<{ id: string }> },
) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('finance:write');
  if ('error' in auth) return auth.error;

  const parsed = parseOr400(patchSchema, await req.json());
  if ('error' in parsed) return parsed.error;

  try {
    const { dateEcheance, ...rest } = parsed.data;
    const patch: Parameters<typeof updateFiscalObligation>[1] = { ...rest };
    if (dateEcheance) patch.dateEcheance = new Date(dateEcheance);
    const updated = await updateFiscalObligation(id, patch);
    return NextResponse.json(updated);
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur mise à jour'), 500);
  }
}
