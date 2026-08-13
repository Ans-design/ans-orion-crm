export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyPermission } from '@/lib/auth-utils';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { runApiHandler } from '@/lib/api-guard';
import { TASK_TYPES } from '@/lib/constants/metier-task';
import { created } from '@/lib/server/http/api-response';
import {
  createMetierTask,
  getMetierTaskStats,
  listMetierTasks,
} from '@/lib/services/metier-task-service';
import {
  createMetierTaskSchema,
  parseMetierTaskListQuery,
} from '@/lib/server/modules/equipe/metier-tasks.validation';

export async function GET(req: NextRequest) {
  const auth = await requireAnyPermission('commandes:read', 'production:read', 'production:write', 'rh:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('equipe/taches GET', async () => {
    const query = parseMetierTaskListQuery(req.nextUrl.searchParams);

    if (query.resume) {
      const { getDailyTaskResume } = await import('@/lib/services/metier-task-service');
      const resume = await getDailyTaskResume(query.mine ? auth.userId : undefined, query.mine ? auth.userName : undefined);
      return NextResponse.json({ resume });
    }

    if (query.statsOnly) {
      const roleTypeMap: Record<string, string | undefined> = {
        production: 'production',
        designer: 'graphisme',
        livraison: 'logistique',
        commercial: 'commercial',
      };
      const filterType = query.type || roleTypeMap[auth.role];
      const stats = await getMetierTaskStats(
        filterType ? { type: filterType as typeof TASK_TYPES[number] } : undefined,
      );
      if (query.kpi) {
        const { getMetierTaskKpis } = await import('@/lib/services/metier-task-service');
        const assigneeKpis = await getMetierTaskKpis();
        return NextResponse.json({ ...stats, assigneeKpis });
      }
      return NextResponse.json(stats);
    }

    const tasks = await listMetierTasks({
      type: query.type,
      status: query.status,
      commandeId: query.commandeId,
      mine: query.mine,
      userId: auth.userId,
      userName: auth.userName,
    });

    return NextResponse.json(tasks);
  }, { fallbackResponse: [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAnyPermission('commandes:write', 'production:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('equipe/taches POST', async (): Promise<Response> => {
    const parsed = parseBody(createMetierTaskSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    const d = parsed.data;
    const task = await createMetierTask({
      title: d.title,
      description: d.description,
      type: d.type,
      priorite: d.priorite,
      commandeId: d.commandeId,
      productionId: d.productionId,
      assigneeName: d.assigneeName,
      createdById: auth.userId,
      createdByName: auth.userName,
      estimatedMin: d.estimatedMin,
    });
    return created(task);
  });
}
