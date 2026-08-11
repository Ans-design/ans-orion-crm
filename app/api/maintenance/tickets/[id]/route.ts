export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-utils';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { resolveParams } from '@/lib/api/route-params';
import { updateMaintenanceTicketSchema } from '@/lib/server/modules/maintenance/maintenance.validation';

export async function PATCH(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const auth = await requirePermission('production:write');
  if ('error' in auth) return auth.error;

  const { id } = await resolveParams(ctx.params);

  const parsed = parseBody(updateMaintenanceTicketSchema, await req.json());
  if (!parsed.ok) return apiError(parsed.error, 400);

  try {
    const body = parsed.data;
    const before = await prisma.maintenanceTicket.findUnique({
      where: { id },
      include: { machine: true, equipment: true },
    });
    if (!before) return apiError('Ticket introuvable', 404);

    const data: Record<string, unknown> = { ...body };
    if (body.statut && ['Résolu', 'Clôturé'].includes(body.statut)) {
      data.resolvedAt = new Date();
    }

    const ticket = await prisma.maintenanceTicket.update({
      where: { id },
      data,
      include: { machine: true, equipment: true, assignee: true },
    });

    if (body.statut && ['Résolu', 'Clôturé'].includes(body.statut)) {
      if (before.machineId) {
        await prisma.machine.update({ where: { id: before.machineId }, data: { status: 'ok' } });
      }
      if (before.equipmentId) {
        await prisma.equipment.update({ where: { id: before.equipmentId }, data: { etat: 'affecte' } });
      }
    }

    return NextResponse.json(ticket);
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur mise à jour ticket'), 500);
  }
}
