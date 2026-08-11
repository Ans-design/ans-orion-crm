export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, ROLE_LABELS } from '@/lib/auth-utils';
import { logAudit } from '@/lib/audit';
import { runApiHandler } from '@/lib/api-guard';
import { apiError } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { updateUserRoleSchema } from '@/lib/server/modules/users/users.validation';

export async function GET() {
  const auth = await requirePermission('users:manage');
  if ('error' in auth) return auth.error;

  return runApiHandler('users GET', async () => {
    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, role: true, emailVerified: true,
        createdAt: true, updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ users, roles: ROLE_LABELS });
  }, { fallbackResponse: { users: [], roles: ROLE_LABELS } });
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePermission('users:manage');
  if ('error' in auth) return auth.error;

  return runApiHandler('users PATCH', async (): Promise<Response> => {
    const parsed = parseBody(updateUserRoleSchema, await req.json());
    if (!parsed.ok) return apiError(parsed.error, 400);
    const { userId, role } = parsed.data;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });

    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'UPDATE',
      entity: 'User',
      entityId: user.id,
      entityLabel: user.email || user.name || user.id,
      details: { role },
    });

    return NextResponse.json(user);
  });
}
