export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { updateMetierTask } from '@/lib/services/metier-task-service';
import { patchMetierTaskSchema } from '@/lib/server/modules/equipe/metier-tasks.validation';
import { resolveParams } from '@/lib/api/route-params';

export async function PATCH(
  req: NextRequest,
  ctx: { params: { id: string } | Promise<{ id: string }> },
) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requireAnyPermission('commandes:write', 'production:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('equipe/taches/[id] PATCH', async (): Promise<Response> => {
    const parsed = parseBody(patchMetierTaskSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    const d = parsed.data;
    const { addComment, ...rest } = d;
    const patch: Parameters<typeof updateMetierTask>[1] = { ...rest };

    if (addComment?.trim()) {
      const existing = await prisma.metierTask.findUnique({
        where: { id: id },
        select: { comments: true },
      });
      const { parseTaskComments } = await import('@/lib/metier/task-checklist');
      const prev = parseTaskComments(existing?.comments);
      patch.comments = [
        ...prev,
        {
          id: `c-${Date.now()}`,
          author: auth.userName ?? 'Utilisateur',
          body: addComment.trim(),
          at: new Date().toISOString(),
        },
      ];
    }

    if (d.assigneeName !== undefined) {
      patch.assigneeName = d.assigneeName;
    }
    const task = await updateMetierTask(id, patch);
    return NextResponse.json(task);
  });
}
