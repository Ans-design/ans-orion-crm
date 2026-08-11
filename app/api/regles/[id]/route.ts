import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-utils';
import { logAudit } from '@/lib/audit';
import { runApiHandler } from '@/lib/api-guard';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { updateBusinessRuleSchema } from '@/lib/server/modules/regles/regles.validation';
import { resolveParams } from '@/lib/api/route-params';

export async function PATCH(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('regles:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('regles/[id] PATCH', async () => {
    const existing = await prisma.businessRule.findUnique({ where: { id: id } });
    if (!existing) return NextResponse.json({ error: 'Règle introuvable' }, { status: 404 });

    const parsed = parseBody(updateBusinessRuleSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);

    const {
      reason,
      action: ruleAction,
      condition,
      ruleName,
      ruleType,
      message,
      priority,
      active,
      connected,
      family,
      articleId,
    } = parsed.data;

    const data: Prisma.BusinessRuleUpdateInput = {
      updatedBy: auth.userId,
      version: { increment: 1 },
    };
    if (ruleName !== undefined) data.ruleName = ruleName;
    if (ruleType !== undefined) data.ruleType = ruleType;
    if (condition !== undefined) data.condition = condition as Prisma.InputJsonValue;
    if (ruleAction !== undefined) data.action = ruleAction as Prisma.InputJsonValue;
    if (message !== undefined) data.message = message;
    if (priority !== undefined) data.priority = priority;
    if (active !== undefined) data.active = active;
    if (connected !== undefined) data.connected = connected;
    if (family !== undefined) data.family = family;
    if (articleId !== undefined) data.articleId = articleId;

    const rule = await prisma.businessRule.update({ where: { id: id }, data });

    await prisma.ruleVersion.create({
      data: {
        entityType: 'BusinessRule',
        entityId: rule.id,
        oldValue: existing,
        newValue: rule,
        userId: auth.userId,
        reason: reason || 'Modification admin',
      },
    });

    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'UPDATE',
      entity: 'BusinessRule',
      entityId: rule.id,
      entityLabel: rule.ruleName,
    });

    return NextResponse.json(rule);
  });
}

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('regles:write');
  if ('error' in auth) return auth.error;

  return runApiHandler('regles/[id] DELETE', async () => {
    await prisma.businessRule.delete({ where: { id: id } });
    return NextResponse.json({ success: true });
  });
}
