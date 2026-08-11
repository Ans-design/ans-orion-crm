export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-utils';
import { paginationSchema } from '@/lib/validators/common';
import { z } from 'zod';
import { containsQ } from '@/lib/prisma-filters';

const querySchema = paginationSchema.extend({
  entity: z.string().max(64).optional(),
  entityId: z.string().max(64).optional(),
  /** Alias deep-link hub commande → filtre entity Commande + entityId */
  commande: z.string().max(64).optional(),
  action: z.string().max(32).optional(),
  category: z.enum(['connexions', 'metier']).optional(),
  search: z.string().max(200).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requirePermission('audit:read');
  if ('error' in auth) return auth.error;

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
  }

  const { entity, entityId, commande, action, category, search, limit, offset } = parsed.data;
  const where: Record<string, unknown> = {};
  if (commande) {
    where.entity = 'Commande';
    where.entityId = commande;
  } else {
    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;
  }
  if (action) where.action = action;
  if (category === 'connexions') {
    where.action = { in: ['LOGIN', 'LOGIN_FAILED', 'PASSWORD_RESET_REQUEST'] };
  }
  if (category === 'metier') {
    where.action = { in: ['CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'ACCEPT', 'MERGE'] };
  }
  if (search) {
    where.OR = [
      { entityLabel: containsQ(search) },
      { userName: containsQ(search) },
      { details: containsQ(search) },
    ];
  }

  try {
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset }),
      prisma.auditLog.count({ where }),
    ]);
    return NextResponse.json({ logs, total });
  } catch (error) {
    console.error('[audit]', error instanceof Error ? error.message : 'error');
    return NextResponse.json({ logs: [], total: 0, _warning: 'Historique partiel — base lente' });
  }
}
