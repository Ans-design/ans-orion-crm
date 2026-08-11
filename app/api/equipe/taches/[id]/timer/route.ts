export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAnyPermission } from '@/lib/auth-utils';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { TIMER_ACTIONS } from '@/lib/constants/metier-task';
import { applyTimerAction } from '@/lib/services/metier-task-service';
import { resolveParams } from '@/lib/api/route-params';
import { jsonWithLiveDomains } from '@/lib/live/live-response';

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
  const auth = await requireAnyPermission('commandes:write', 'production:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('equipe/taches timer POST', async (): Promise<Response> => {
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
    // Rafraîchit le rail commande (déblocage Façonnage, etc.)
    return jsonWithLiveDomains(task, ['commandes', 'production']);
  });
}
