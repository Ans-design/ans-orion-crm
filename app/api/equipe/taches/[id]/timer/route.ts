export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/auth-utils';
import { hasPermission } from '@/lib/auth/permissions';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { TIMER_ACTIONS } from '@/lib/constants/metier-task';
import { applyTimerAction } from '@/lib/services/metier-task-service';
import { resolveParams } from '@/lib/api/route-params';
import { jsonWithLiveDomains } from '@/lib/live/live-response';
import { prisma } from '@/lib/prisma';

const evaluationSchema = z.object({
  quality: z.number().int().min(1).max(5),
  delay: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  problemEncountered: z.string().max(500).optional(),
});

const timerSchema = z.object({
  action: z.enum(TIMER_ACTIONS),
  problemNote: z.string().max(500).optional(),
  evaluation: evaluationSchema.optional(),
});

export async function POST(
  req: NextRequest,
  ctx: { params: { id: string } | Promise<{ id: string }> },
) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requireSession();
  if ('error' in auth) return auth.error;

  return runApiHandler('equipe/taches timer POST', async (): Promise<Response> => {
    const existing = await prisma.metierTask.findUnique({
      where: { id },
      select: { assigneeId: true, assigneeName: true },
    });
    if (!existing) return apiError('Tâche introuvable', 404);
    const isAssignee =
      (existing.assigneeId && existing.assigneeId === auth.userId)
      || (existing.assigneeName && existing.assigneeName === auth.userName);
    const canWrite =
      hasPermission(auth.role, 'commandes:write')
      || hasPermission(auth.role, 'production:write');
    if (!isAssignee && !canWrite) {
      return apiError('Cette tâche n’est pas assignée à votre poste', 403);
    }

    const parsed = parseBody(timerSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    const { action, problemNote, evaluation } = parsed.data;
    const task = await applyTimerAction(
      id,
      action,
      problemNote,
      evaluation
        ? { ...evaluation, evaluatedBy: auth.userName ?? 'Utilisateur' }
        : undefined,
    );
    return jsonWithLiveDomains(task, ['commandes', 'production', 'nav', 'rh']);
  });
}
