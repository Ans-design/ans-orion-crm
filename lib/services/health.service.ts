import { prisma } from '@/lib/prisma';
import { withTimeout } from '@/lib/with-timeout';

export type AppHealth = {
  ok: boolean;
  app: string;
  runtime: string;
  timestamp: string;
  env: {
    databaseUrl: boolean;
    nextauthUrl: boolean;
    nextauthSecret: boolean;
    authSecret: boolean;
  };
};

export function getAppHealth(): AppHealth {
  return {
    ok: true,
    app: 'ANS ORION',
    runtime: process.env.HOSTINGER_SITE_URL ? 'hostinger' : 'node',
    timestamp: new Date().toISOString(),
    env: {
      databaseUrl: !!process.env.DATABASE_URL,
      nextauthUrl: !!(process.env.NEXTAUTH_URL || process.env.HOSTINGER_SITE_URL),
      nextauthSecret: !!process.env.NEXTAUTH_SECRET,
      authSecret: !!(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET),
    },
  };
}

export async function getDatabaseHealth() {
  const started = Date.now();
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, 5000, 'health_db');
    return {
      ok: true,
      database: 'connected' as const,
      method: 'prisma' as const,
      latencyMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      ok: false,
      database: 'error' as const,
      error: error instanceof Error ? error.message : 'DB inaccessible',
      latencyMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    };
  }
}

export async function getSystemStatusCounts() {
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
    return {
      ok: true,
      db: { ok: true, database: 'connected' as const },
      counts: { users, clients, commandes, auditLogs, stockItems, machines },
    };
  } catch (error) {
    return {
      ok: false,
      db: { ok: false, error: error instanceof Error ? error.message : 'DB error' },
      counts: null,
    };
  }
}
