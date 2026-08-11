export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { safeErrorMessage } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const auth = await requirePermission('config:view');
  if ('error' in auth) return auth.error;

  try {
    const rows = await prisma.auditLog.findMany({
      where: {
        OR: [
          { action: { contains: 'pricing' } },
          { entity: { in: ['BaseMaterial', 'BasePrintingPrice', 'ArticlePricingProfile'] } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json({ ok: true, data: { rows } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error, 'Audit log indisponible') },
      { status: 500 },
    );
  }
}
