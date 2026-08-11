export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth-utils';
import { ok } from '@/lib/server/http/api-response';
import { parseOr400 } from '@/lib/validators/parse';
import { setWorkflowRuleEnabled } from '@/lib/services/workflow-transition-service';
import {
  exportProductionFluxConfig,
  resetProductionFluxToDefaults,
  simulateProductionFlux,
  syncPlanningFromProductionFlux,
  syncTasksFromProductionFlux,
} from '@/lib/services/production-flux-service';

const actionSchema = z.object({
  action: z.enum([
    'sync-tasks',
    'sync-planning',
    'simulate',
    'reset',
    'export',
    'toggle-workflow-rule',
  ]),
  ruleId: z.string().optional(),
  enabled: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;

  const parsed = parseOr400(actionSchema, await req.json());
  if ('error' in parsed) return parsed.error;

  const { action, ruleId, enabled } = parsed.data;

  if (action === 'reset') {
    const admin = await requirePermission('settings:write');
    if ('error' in admin) return admin.error;
    const config = await resetProductionFluxToDefaults({
      userId: admin.userId,
      userName: admin.userName,
    });
    return ok({ config });
  }

  if (action === 'toggle-workflow-rule') {
    const admin = await requirePermission('settings:write');
    if ('error' in admin) return admin.error;
    if (!ruleId || enabled === undefined) {
      return NextResponse.json({ ok: false, error: { message: 'ruleId et enabled requis' } }, { status: 400 });
    }
    const rule = await setWorkflowRuleEnabled(ruleId, enabled);
    return ok({ rule });
  }

  if (action === 'sync-tasks') {
    const admin = await requirePermission('settings:write');
    if ('error' in admin) return admin.error;
    const result = await syncTasksFromProductionFlux({
      userId: admin.userId,
      userName: admin.userName,
    });
    return ok(result);
  }

  if (action === 'sync-planning') {
    const admin = await requirePermission('settings:write');
    if ('error' in admin) return admin.error;
    const result = await syncPlanningFromProductionFlux({
      userId: admin.userId,
      userName: admin.userName,
    });
    return ok(result);
  }

  if (action === 'simulate') {
    const result = await simulateProductionFlux();
    return ok(result);
  }

  const config = await exportProductionFluxConfig();
  return ok({ config, exportedAt: new Date().toISOString() });
}
