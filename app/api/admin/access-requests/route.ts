export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-utils';
import { runApiHandler } from '@/lib/api-guard';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('users:manage');
  if ('error' in auth) return auth.error;

  return runApiHandler('admin/access-requests GET', async () => {
    const statut = req.nextUrl.searchParams.get('statut');
    const where = statut && statut !== 'tous' ? { statut } : {};

    const items = await prisma.accessRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const counts = await prisma.accessRequest.groupBy({
      by: ['statut'],
      _count: { id: true },
    });

    return NextResponse.json({
      items,
      counts: Object.fromEntries(counts.map((c) => [c.statut, c._count.id])),
    });
  }, { fallback: { items: [], counts: {} } });
}
