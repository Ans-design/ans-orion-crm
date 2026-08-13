export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/auth-utils';
import { hasPermission } from '@/lib/auth/permissions';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { resolveParams } from '@/lib/api/route-params';
import { jsonWithLiveDomains } from '@/lib/live/live-response';
import { prisma } from '@/lib/prisma';
import { DELAY_EXTRA_MAX, DELAY_EXTRA_MIN, DELAY_MOTIF_MIN } from '@/lib/metier/task-delay';
import { declareTaskProductionDelay } from '@/lib/services/task-delay-service';

const delaySchema = z.object({
  motif: z.string().trim().min(DELAY_MOTIF_MIN).max(500),
  extraMin: z.number().int().min(DELAY_EXTRA_MIN).max(DELAY_EXTRA_MAX),
});

export async function POST(
  req: NextRequest,
  ctx: { params: { id: string } | Promise<{ id: string }> },
) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requireSession();
  if ('error' in auth) return auth.error;

  return runApiHandler('equipe/taches delay POST', async (): Promise<Response> => {
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

    const parsed = parseBody(delaySchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    try {
      const result = await declareTaskProductionDelay({
        taskId: id,
        motif: parsed.data.motif,
        extraMin: parsed.data.extraMin,
        declaredByName: auth.userName,
      });
      return jsonWithLiveDomains(result, ['commandes', 'production', 'nav', 'rh']);
    } catch (e) {
      return apiError(e instanceof Error ? e.message : 'Déclaration impossible', 400);
    }
  });
}
