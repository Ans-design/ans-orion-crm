export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-utils';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseOr400 } from '@/lib/validators/parse';
import { planningSlotSchema } from '@/lib/validators/phase3';
import { syncCommandeProductionStart } from '@/lib/services/production-commande-sync';
import { logAudit } from '@/lib/audit';
import { runApiHandler } from '@/lib/api-guard';
import { created } from '@/lib/server/http/api-response';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('planning:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('planning GET', async () => {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const where: Record<string, unknown> = {};
  if (from || to) {
    where.startAt = {};
    if (from) (where.startAt as Record<string, Date>).gte = new Date(from);
    if (to) (where.startAt as Record<string, Date>).lte = new Date(to);
  }

  const slots = await prisma.productionSlot.findMany({
    where,
    orderBy: { startAt: 'asc' },
  });

  return NextResponse.json(slots);
  }, { fallbackResponse: [] });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('planning:write');
  if ('error' in auth) return auth.error;

  try {
    const parsed = parseOr400(planningSlotSchema, await req.json());
    if ('error' in parsed) return parsed.error;

    const { startAt, endAt, ...rest } = parsed.data;
    if (new Date(endAt) <= new Date(startAt)) {
      return apiError('La fin doit être après le début', 400);
    }

    const slot = await prisma.productionSlot.create({
      data: {
        ...rest,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
      },
    });

    if (rest.commandeId) {
      await syncCommandeProductionStart(rest.commandeId, {
        userId: auth.userId,
        userName: auth.userName,
      }).catch(() => {});
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
      await logAudit({
        userId: auth.userId,
        userName: auth.userName,
        action: 'CREATE',
        entity: 'ProductionSlot',
        entityId: slot.id,
        entityLabel: rest.title ?? slot.id,
        details: { commandeId: rest.commandeId, planningSync: true },
      });
    }

    const { attachLiveDomains } = await import('@/lib/live/live-response');
    return attachLiveDomains(created(slot), ['commandes', 'production', 'nav', 'rh']);
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur création créneau'), 500);
  }
}
