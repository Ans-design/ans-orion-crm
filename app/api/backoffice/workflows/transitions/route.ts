export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth-utils';
import { logAudit } from '@/lib/audit';
import { created } from '@/lib/server/http/api-response';
import {
  createWorkflowRule,
  resetWorkflowTransitionsToDefaults,
  setWorkflowRuleEnabled,
} from '@/lib/services/workflow-transition-service';
import { parseOr400 } from '@/lib/validators/parse';

const createSchema = z.object({
  entity: z.enum(['commande', 'chain']),
  fromStatut: z.string().min(1),
  toStatut: z.string().min(1),
  actionKey: z.string().optional(),
  module: z.string().optional(),
  label: z.string().optional(),
});

const patchSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean(),
});

export async function POST(req: NextRequest) {
  const auth = await requirePermission('settings:write');
  if ('error' in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  if (body.action === 'reset') {
    const count = await resetWorkflowTransitionsToDefaults();
    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'WORKFLOW_RESET',
      entity: 'WorkflowTransitionRule',
      entityId: 'defaults',
      details: { count },
    });
    return created({ count });
  }

  const parsed = parseOr400(createSchema, body);
  if ('error' in parsed) {
    return parsed.error ?? NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }

  const rule = await createWorkflowRule(parsed.data);
  await logAudit({
    userId: auth.userId,
    userName: auth.userName,
    action: 'WORKFLOW_RULE_CREATE',
    entity: 'WorkflowTransitionRule',
    entityId: rule.id,
    details: parsed,
  });

  return created(rule);
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePermission('settings:write');
  if ('error' in auth) return auth.error;

  const parsed = parseOr400(patchSchema, await req.json());
  if ('error' in parsed) {
    return parsed.error ?? NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }

  const rule = await setWorkflowRuleEnabled(parsed.data.id, parsed.data.enabled);
  if (!rule) {
    return NextResponse.json({ error: 'Règle introuvable' }, { status: 404 });
  }

  await logAudit({
    userId: auth.userId,
    userName: auth.userName,
    action: parsed.data.enabled ? 'WORKFLOW_RULE_ENABLE' : 'WORKFLOW_RULE_DISABLE',
    entity: 'WorkflowTransitionRule',
    entityId: rule.id,
    details: { from: rule.fromStatut, to: rule.toStatut, entity: rule.entity },
  });

  return NextResponse.json({ ok: true, rule });
}
