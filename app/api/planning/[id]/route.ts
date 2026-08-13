export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-utils';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseOr400 } from '@/lib/validators/parse';
import { planningSlotSchema } from '@/lib/validators/phase3';
import { runApiHandler } from '@/lib/api-guard';
import { resolveParams } from '@/lib/api/route-params';

export async function PATCH(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('planning:write');
  if ('error' in auth) return auth.error;

  try {
    const parsed = parseOr400(planningSlotSchema.partial(), await req.json());
    if ('error' in parsed) return parsed.error;

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.startAt) data.startAt = new Date(parsed.data.startAt);
    if (parsed.data.endAt) data.endAt = new Date(parsed.data.endAt);

    if (parsed.data.startAt || parsed.data.endAt) {
      const existing = await prisma.productionSlot.findUnique({ where: { id } });
      if (!existing) return apiError('Créneau introuvable', 404);
      const start = parsed.data.startAt ? new Date(parsed.data.startAt) : existing.startAt;
      const end = parsed.data.endAt ? new Date(parsed.data.endAt) : existing.endAt;
      if (end.getTime() <= start.getTime()) {
        return apiError('La fin doit être après le début', 400);
      }
    }

    const slot = await prisma.productionSlot.update({
      where: { id: id },
      data,
    });
    if (
      slot.commandeId
      && slot.operateur
      && (
        parsed.data.operateur !== undefined
        || parsed.data.machine !== undefined
        || parsed.data.startAt !== undefined
        || parsed.data.endAt !== undefined
        || parsed.data.title !== undefined
      )
    ) {
      const { syncPlanningSlotToMetierTasks } = await import('@/lib/services/planning-task-sync');
      await syncPlanningSlotToMetierTasks({
        id: slot.id,
        title: slot.title,
        commandeId: slot.commandeId,
        machine: slot.machine,
        operateur: slot.operateur,
        startAt: slot.startAt,
        endAt: slot.endAt,
        assignedBy: auth.userName,
      }).catch(() => {});
    }
    const { jsonWithLiveDomains } = await import('@/lib/live/live-response');
    return jsonWithLiveDomains(slot, ['commandes', 'production', 'nav', 'rh']);
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur mise à jour'), 500);
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('planning:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('planning/[id] DELETE', async () => {
    await prisma.productionSlot.delete({ where: { id: id } });
    return NextResponse.json({ success: true });
  });
}
