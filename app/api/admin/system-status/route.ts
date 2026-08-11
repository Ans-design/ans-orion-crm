export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { withTimeout } from '@/lib/with-timeout';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const auth = await requirePermission('config:publish');
  if ('error' in auth) return auth.error;

  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, 5000, 'system_status_db');

    const [users, clients, commandes, auditLogs, stockItems, machines] = await Promise.all([
      prisma.user.count(),
      prisma.client.count(),
      prisma.commande.count(),
      prisma.auditLog.count(),
      prisma.stockItem.count().catch(() => 0),
      prisma.machine.count().catch(() => 0),
    ]);

    return NextResponse.json({
      ok: true,
      app: 'ANS ORION',
      nodeEnv: process.env.NODE_ENV ?? 'unknown',
      runtime: process.env.VERCEL ? 'vercel' : 'hostinger',
      database: 'connected',
      counts: { users, clients, commandes, auditLogs, stockItems, machines },
      env: {
        useProductionDb: process.env.USE_PRODUCTION_DB === 'true',
        nextauthUrl: Boolean(process.env.NEXTAUTH_URL),
        databasePostgres: process.env.DATABASE_URL?.startsWith('postgres') ?? false,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        database: 'error',
        error: error instanceof Error ? error.message : 'Erreur système',
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
