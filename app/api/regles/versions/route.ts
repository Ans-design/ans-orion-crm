export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-utils';
import { runApiHandler } from '@/lib/api-guard';
import { reglesVersionsQuerySchema } from '@/lib/server/modules/regles/regles.validation';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('regles:read');
  if ('error' in auth) return auth.error;

  return runApiHandler('regles/versions GET', async () => {
    const parsed = reglesVersionsQuerySchema.safeParse({
      entityType: req.nextUrl.searchParams.get('entityType') || '',
      entityId: req.nextUrl.searchParams.get('entityId') || '',
      limit: req.nextUrl.searchParams.get('limit') || 50,
    });
    if (!parsed.success) {
      return NextResponse.json({ versions: [], total: 0, error: 'Paramètres invalides' }, { status: 400 });
    }
    const { entityType, entityId, limit } = parsed.data;

    const where: Record<string, unknown> = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    const versions = await prisma.ruleVersion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ versions, total: versions.length });
  }, { fallbackResponse: { versions: [], total: 0 } });
}
