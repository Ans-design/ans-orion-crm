export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { ok, fromError } from '@/lib/server/http/api-response';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('audit:read');
  if ('error' in auth) return auth.error;

  const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '50', 10) || 50));
  const moduleFilter = req.nextUrl.searchParams.get('module') ?? undefined;

  try {
    const where = moduleFilter ? { entity: moduleFilter } : {};
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          entityLabel: true,
          userName: true,
          createdAt: true,
          details: true,
          oldValue: true,
          newValue: true,
        },
      }),
      prisma.auditLog.count({ where }),
    ]);
    return ok({ logs, total, limit });
  } catch (error) {
    return fromError(error, 'Audit indisponible');
  }
}
