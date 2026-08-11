export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRhEmployee } from '@/lib/server/auth/rh-access';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { resolveParams } from '@/lib/api/route-params';
import { assertOwnEmployeeOrRhAdmin } from '@/lib/server/modules/rh/rh-employee-scope';
import { justifyRetardInputSchema } from '@/lib/server/modules/rh/rh.validation';
import { justifyPresenceRetard } from '@/lib/server/modules/rh/rh-presences.service';

export async function PATCH(
  req: NextRequest,
  ctx: { params: { id: string } | Promise<{ id: string }> },
) {
  const auth = await requireRhEmployee();
  if ('error' in auth) return auth.error;

  const { id } = await resolveParams(ctx.params);

  return runApiHandler('rh presence PATCH', async (): Promise<Response> => {
    const presence = await prisma.employeePresence.findUnique({
      where: { id },
      select: { id: true, employeeId: true },
    });
    if (!presence) return apiError('Présence introuvable', 404);

    const denied = await assertOwnEmployeeOrRhAdmin(auth, presence.employeeId);
    if (denied) return denied;

    const parsed = parseBody(justifyRetardInputSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    try {
      const updated = await justifyPresenceRetard(id, parsed.data);
      return NextResponse.json(updated);
    } catch (error) {
      return apiError(safeErrorMessage(error, 'Erreur justification'), 500);
    }
  });
}
