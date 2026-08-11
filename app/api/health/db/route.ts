export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 10;

import { NextResponse } from 'next/server';
import { withTimeout } from '@/lib/with-timeout';
import { loadBundledProductionEnv } from '@/lib/bundled-production-env';
import { isPrismaSqliteMismatch, probePostgresRaw } from '@/lib/db-health-probe';

const DB_TIMEOUT_MS = 8_000;
const ROUTE_TIMEOUT_MS = 12_000;

async function probeDatabase() {
  const started = Date.now();
  loadBundledProductionEnv();
  const dbUrl = process.env.DATABASE_URL?.trim();

  try {
    const { prisma } = await import('@/lib/prisma');
    await withTimeout(prisma.$queryRaw`SELECT 1`, DB_TIMEOUT_MS, 'db_health');
    return {
      ok: true,
      database: 'connected',
      method: 'prisma',
      latencyMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    if (dbUrl?.startsWith('postgres')) {
      try {
        const { latencyMs } = await probePostgresRaw(dbUrl, DB_TIMEOUT_MS);
        return {
          ok: true,
          database: 'connected',
          method: 'pg-fallback',
          latencyMs,
          warning: isPrismaSqliteMismatch(error)
            ? 'Client Prisma SQLite — rebuild:hostinger + Redéployer hPanel'
            : 'Prisma timeout — connexion pg directe OK',
          timestamp: new Date().toISOString(),
        };
      } catch (pgErr) {
        throw pgErr;
      }
    }
    throw error;
  }
}

/** Test DB — détail complet en dev/local uniquement. */
export async function GET() {
  const verbose =
    process.env.LOCAL_DEV === 'true' ||
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'test';

  const started = Date.now();
  try {
    const result = await withTimeout(probeDatabase(), ROUTE_TIMEOUT_MS, 'health_db_route');
    if (!verbose) {
      return NextResponse.json({ ok: true, database: 'connected' });
    }
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[health/db]', error);
    if (!verbose) {
      return NextResponse.json({ ok: false, database: 'error' }, { status: 503 });
    }
    return NextResponse.json(
      {
        ok: false,
        database: 'error',
        latencyMs: Date.now() - started,
        error: message.slice(0, 200),
        hint: message.includes('timeout')
          ? 'Neon lent ou DATABASE_URL invalide'
          : message.includes('connection slots')
            ? 'Pool Neon saturé — utiliser URL -pooler avec connection_limit=1 (redeploy)'
            : isPrismaSqliteMismatch(error)
            ? 'Rebuild Hostinger : npm run build:hostinger puis Redéployer hPanel'
            : 'Vérifiez credentials Neon',
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
