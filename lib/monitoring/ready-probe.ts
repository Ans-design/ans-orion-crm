import { withTimeout } from '@/lib/with-timeout';
import { isSentryEnabled } from '@/lib/monitoring/sentry-config';

export type ReadinessCheck = {
  name: string;
  ok: boolean;
  latencyMs?: number;
  detail?: string;
};

export type ReadinessReport = {
  ok: boolean;
  timestamp: string;
  version: string;
  runtime: string;
  checks: ReadinessCheck[];
};

async function checkDatabase(): Promise<ReadinessCheck> {
  const started = Date.now();
  try {
    const { prisma } = await import('@/lib/prisma');
    await withTimeout(prisma.$queryRaw`SELECT 1`, 5000, 'ready_db');
    return { name: 'database', ok: true, latencyMs: Date.now() - started };
  } catch (error) {
    return {
      name: 'database',
      ok: false,
      latencyMs: Date.now() - started,
      detail: error instanceof Error ? error.message.slice(0, 120) : String(error),
    };
  }
}

function checkEnv(): ReadinessCheck {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const authSecret =
    process.env.NEXTAUTH_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
  const ok =
    Boolean(databaseUrl?.startsWith('postgres') || databaseUrl?.startsWith('file:')) &&
    Boolean(authSecret && authSecret.length >= 32);
  return {
    name: 'env',
    ok,
    detail: ok ? undefined : 'DATABASE_URL ou secret auth manquant',
  };
}

function checkSentry(): ReadinessCheck {
  return {
    name: 'sentry',
    ok: true,
    detail: isSentryEnabled() ? 'configured' : 'disabled',
  };
}

/** Sonde readiness — utilisée par /api/health/ready (load balancers, CI). */
export async function probeReadiness(): Promise<ReadinessReport> {
  const [database, env, sentry] = await Promise.all([
    checkDatabase(),
    Promise.resolve(checkEnv()),
    Promise.resolve(checkSentry()),
  ]);

  const checks = [env, database, sentry];
  const ok = checks.every((c) => c.ok || c.name === 'sentry');

  return {
    ok,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '0.0.0',
    runtime: process.env.VERCEL ? 'vercel' : process.env.NODE_ENV ?? 'node',
    checks,
  };
}
