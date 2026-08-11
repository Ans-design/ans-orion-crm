export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireApiAccess } from '@/lib/auth-utils';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { z } from 'zod';
import { completeTournee, startTournee } from '@/lib/logistics/tournee-service';
import { resolveParams } from '@/lib/api/route-params';

const actionSchema = z.object({
  action: z.enum(['start', 'complete']),
});

export async function PUT(
  req: NextRequest,
  ctx: { params: { id: string } | Promise<{ id: string }> },
) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requireApiAccess('livraisons:write', req);
  if ('error' in auth) return auth.error;

  const parsed = parseBody(actionSchema, await req.json());
  if (!parsed.ok) return apiError(parsed.error, 400);

  try {
    const result =
      parsed.data.action === 'start'
        ? await startTournee(id, auth.userId)
        : await completeTournee(id, auth.userId);

    if (!result) return apiError('Tournée introuvable', 404);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur tournée'), 500);
  }
}
